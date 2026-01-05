import { ApiClient } from './api-client';

export interface BusStop {
  stopNo: string;
  name: string;
  nodeId: string;
  stopType: string;
  x?: number;
  y?: number;
}

export class BusApiClient {
  constructor(private apiClient: ApiClient) {}

  async searchStops(query: string): Promise<BusStop[]> {
    return this.apiClient.get<BusStop[]>(`/bus/stops?query=${encodeURIComponent(query)}`);
  }
}
