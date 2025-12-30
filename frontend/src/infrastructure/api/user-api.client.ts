import { ApiClient } from './api-client';

export interface User {
  id: string;
  email: string;
  name: string;
  location?: {
    address: string;
    lat: number;
    lng: number;
  };
}

export interface CreateUserDto {
  email: string;
  name: string;
  location?: {
    address: string;
    lat: number;
    lng: number;
  };
}

export class UserApiClient {
  constructor(private apiClient: ApiClient) {}

  async createUser(dto: CreateUserDto): Promise<User> {
    return this.apiClient.post<User>('/users', dto);
  }

  async getUser(id: string): Promise<User> {
    return this.apiClient.get<User>(`/users/${id}`);
  }
}

