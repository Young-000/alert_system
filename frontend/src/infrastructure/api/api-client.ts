import axios, { AxiosInstance, AxiosError } from 'axios';

export class ApiClient {
  private client: AxiosInstance;
  private maxRetries = 2;

  constructor(
    baseURL: string = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000',
  ) {
    this.client = axios.create({
      baseURL,
      timeout: 30000, // 30초 타임아웃 (Render cold start 대응)
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
      },
    });

    // 인터셉터: 요청 시 JWT 토큰 추가
    this.client.interceptors.request.use((config) => {
      const token = localStorage.getItem('accessToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // 인터셉터: 응답 에러 처리
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        // 로그인/회원가입 API는 401 리다이렉트 제외 (에러 메시지 표시 필요)
        const isAuthEndpoint = error.config?.url?.startsWith('/auth/');
        if (error.response?.status === 401 && !isAuthEndpoint) {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('userId');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  private async withRetry<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: AxiosError | Error | null = null;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as AxiosError | Error;
        const axiosError = error as AxiosError;

        // 타임아웃이나 네트워크 에러인 경우만 재시도
        const isRetryable =
          axiosError.code === 'ECONNABORTED' || // 타임아웃
          axiosError.code === 'ERR_NETWORK' ||  // 네트워크 에러
          !axiosError.response;                  // 응답 없음

        if (!isRetryable || attempt === this.maxRetries) {
          throw error;
        }

        // 재시도 전 대기 (점진적 증가)
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }

    throw lastError;
  }

  async get<T>(url: string): Promise<T> {
    return this.withRetry(async () => {
      const response = await this.client.get<T>(url);
      return response.data;
    });
  }

  async post<T, D = unknown>(url: string, data?: D): Promise<T> {
    return this.withRetry(async () => {
      const response = await this.client.post<T>(url, data);
      return response.data;
    });
  }

  async put<T, D = unknown>(url: string, data?: D): Promise<T> {
    return this.withRetry(async () => {
      const response = await this.client.put<T>(url, data);
      return response.data;
    });
  }

  async delete<T>(url: string): Promise<T> {
    return this.withRetry(async () => {
      const response = await this.client.delete<T>(url);
      return response.data;
    });
  }

  async patch<T, D = unknown>(url: string, data?: D): Promise<T> {
    return this.withRetry(async () => {
      const response = await this.client.patch<T>(url, data);
      return response.data;
    });
  }
}
