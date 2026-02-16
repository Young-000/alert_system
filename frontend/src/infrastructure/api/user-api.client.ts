import type { ApiClient } from './api-client';

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

  async updateLocation(id: string, location: NonNullable<User['location']>): Promise<User> {
    return this.apiClient.patch<User>(`/users/${id}/location`, { location });
  }

  async exportData(id: string): Promise<Record<string, unknown>> {
    return this.apiClient.get<Record<string, unknown>>(`/users/${id}/export-data`);
  }

  async deleteAllData(id: string): Promise<{ success: boolean }> {
    return this.apiClient.delete<{ success: boolean }>(`/users/${id}/delete-all-data`);
  }
}
