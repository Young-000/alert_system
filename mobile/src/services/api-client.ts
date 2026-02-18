import { API_BASE_URL } from '@/constants/config';
import { tokenService } from './token.service';

const REQUEST_TIMEOUT_MS = 30000;
const MAX_RETRIES = 2;
const RETRY_BASE_DELAY_MS = 1000;

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: string,
  ) {
    super(`API Error ${status}: ${body}`);
    this.name = 'ApiError';
  }
}

class ApiClient {
  private baseURL: string;
  private maxRetries = MAX_RETRIES;
  private onUnauthorized: (() => void) | null = null;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  /** 401 발생 시 콜백 등록 (AuthProvider에서 설정) */
  setOnUnauthorized(callback: () => void): void {
    this.onUnauthorized = callback;
  }

  private async getHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    const token = await tokenService.getAccessToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  private handleAuthError(url: string, status: number): void {
    const isAuthEndpoint = url.startsWith('/auth/');
    if (status === 401 && !isAuthEndpoint && this.onUnauthorized) {
      this.onUnauthorized();
    }
  }

  private async request<T>(url: string, options: RequestInit = {}): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(`${this.baseURL}${url}`, {
        ...options,
        headers: await this.getHeaders(),
        signal: controller.signal,
      });

      if (!response.ok) {
        const body = await response.text();
        this.handleAuthError(url, response.status);
        throw new ApiError(response.status, body);
      }

      const text = await response.text();
      return text ? (JSON.parse(text) as T) : (undefined as T);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private async withRetry<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;

        // Only retry on network errors or timeouts, not HTTP errors
        const isRetryable =
          error instanceof TypeError || // fetch network error
          (error instanceof DOMException && error.name === 'AbortError'); // timeout

        if (!isRetryable || attempt === this.maxRetries) {
          throw error;
        }

        await new Promise((resolve) =>
          setTimeout(resolve, RETRY_BASE_DELAY_MS * (attempt + 1)),
        );
      }
    }

    throw lastError;
  }

  async get<T>(url: string): Promise<T> {
    return this.withRetry(() => this.request<T>(url));
  }

  async post<T, D = unknown>(url: string, data?: D): Promise<T> {
    return this.withRetry(() =>
      this.request<T>(url, {
        method: 'POST',
        body: data !== undefined ? JSON.stringify(data) : undefined,
      }),
    );
  }

  async put<T, D = unknown>(url: string, data?: D): Promise<T> {
    return this.withRetry(() =>
      this.request<T>(url, {
        method: 'PUT',
        body: data !== undefined ? JSON.stringify(data) : undefined,
      }),
    );
  }

  async patch<T, D = unknown>(url: string, data?: D): Promise<T> {
    return this.withRetry(() =>
      this.request<T>(url, {
        method: 'PATCH',
        body: data !== undefined ? JSON.stringify(data) : undefined,
      }),
    );
  }

  async delete<T, D = unknown>(url: string, data?: D): Promise<T> {
    return this.withRetry(() =>
      this.request<T>(url, {
        method: 'DELETE',
        body: data !== undefined ? JSON.stringify(data) : undefined,
      }),
    );
  }
}

export const apiClient = new ApiClient();
