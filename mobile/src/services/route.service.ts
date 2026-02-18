import { apiClient } from './api-client';

import type { RouteResponse } from '@/types/home';
import type { CreateRouteDto, UpdateRouteDto } from '@/types/route';

export const routeService = {
  async fetchRoutes(userId: string): Promise<RouteResponse[]> {
    return apiClient.get<RouteResponse[]>(`/routes/user/${userId}`);
  },

  async createRoute(dto: CreateRouteDto): Promise<RouteResponse> {
    return apiClient.post<RouteResponse, CreateRouteDto>('/routes', dto);
  },

  async updateRoute(id: string, dto: UpdateRouteDto): Promise<RouteResponse> {
    return apiClient.patch<RouteResponse, UpdateRouteDto>(`/routes/${id}`, dto);
  },

  async deleteRoute(id: string): Promise<void> {
    await apiClient.delete(`/routes/${id}`);
  },
};
