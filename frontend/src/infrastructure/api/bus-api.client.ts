import { ApiClient } from './api-client';

export interface BusStop {
  stopNo: string;
  name: string;
  nodeId: string;
  stopType: string;
  x?: number;
  y?: number;
}

export interface BusArrival {
  stopId: string;
  routeId: string;
  routeName: string;
  arrivalTime: number;
  remainingStops: number;
}

export class BusApiClient {
  constructor(private apiClient: ApiClient) {}

  async searchStops(query: string): Promise<BusStop[]> {
    return this.apiClient.get<BusStop[]>(`/bus/stops?query=${encodeURIComponent(query)}`);
  }

  async getArrival(stopId: string): Promise<BusArrival[]> {
    return this.apiClient.get<BusArrival[]>(`/bus/arrival/${encodeURIComponent(stopId)}`);
  }
}
