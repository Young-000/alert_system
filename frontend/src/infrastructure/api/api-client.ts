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
