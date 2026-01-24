import axios, { AxiosInstance } from 'axios';

export class ApiClient {
  private client: AxiosInstance;

  constructor(
    baseURL: string = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000',
  ) {
    this.client = axios.create({
      baseURL,
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

  async get<T>(url: string): Promise<T> {
    const response = await this.client.get<T>(url);
    return response.data;
  }

  async post<T, D = unknown>(url: string, data?: D): Promise<T> {
    const response = await this.client.post<T>(url, data);
    return response.data;
  }

  async put<T, D = unknown>(url: string, data?: D): Promise<T> {
    const response = await this.client.put<T>(url, data);
    return response.data;
  }

  async delete<T>(url: string): Promise<T> {
    const response = await this.client.delete<T>(url);
    return response.data;
  }

  async patch<T, D = unknown>(url: string, data?: D): Promise<T> {
    const response = await this.client.patch<T>(url, data);
    return response.data;
  }
}
