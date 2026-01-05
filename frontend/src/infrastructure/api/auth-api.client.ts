import { ApiClient } from './api-client';

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    name: string;
  };
  accessToken: string;
}

export interface RegisterDto {
  email: string;
  password: string;
  name: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export class AuthApiClient {
  private client: ApiClient;

  constructor(client?: ApiClient) {
    this.client = client || new ApiClient();
  }

  async register(dto: RegisterDto): Promise<AuthResponse> {
    return this.client.post<AuthResponse>('/auth/register', dto);
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    return this.client.post<AuthResponse>('/auth/login', dto);
  }
}

export const authApiClient = new AuthApiClient();
