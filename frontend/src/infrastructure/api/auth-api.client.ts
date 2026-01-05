import { ApiClient } from './api-client';

export interface RegisterDto {
  email: string;
  password: string;
  name: string;
  phoneNumber?: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  user: {
    id: string;
    email: string;
    name: string;
    phoneNumber?: string;
  };
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  phoneNumber?: string;
  location?: {
    address: string;
    lat: number;
    lng: number;
  };
}

export class AuthApiClient {
  constructor(private apiClient: ApiClient) {}

  async register(dto: RegisterDto): Promise<AuthResponse> {
    const response = await this.apiClient.post<AuthResponse>('/auth/register', dto);
    this.saveToken(response.accessToken);
    this.saveUser(response.user);
    return response;
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const response = await this.apiClient.post<AuthResponse>('/auth/login', dto);
    this.saveToken(response.accessToken);
    this.saveUser(response.user);
    return response;
  }

  async getProfile(): Promise<UserProfile> {
    return this.apiClient.get<UserProfile>('/auth/me');
  }

  logout(): void {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('userId');
    localStorage.removeItem('user');
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem('accessToken');
  }

  getToken(): string | null {
    return localStorage.getItem('accessToken');
  }

  getUserId(): string | null {
    return localStorage.getItem('userId');
  }

  private saveToken(token: string): void {
    localStorage.setItem('accessToken', token);
  }

  private saveUser(user: AuthResponse['user']): void {
    localStorage.setItem('userId', user.id);
    localStorage.setItem('user', JSON.stringify(user));
  }
}
