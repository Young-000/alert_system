import { ApiClient } from './api-client';

export interface BusStop {
  stopId: string;
  stopName: string;
  direction: string;
}

export interface BusSearchResult {
  stops: BusStop[];
}

export class BusApiClient {
  constructor(private apiClient: ApiClient) {}

  async searchStops(keyword: string): Promise<BusSearchResult> {
    return this.apiClient.get<BusSearchResult>(`/bus/stops/search?keyword=${encodeURIComponent(keyword)}`);
  }

  async getArrival(stopId: string): Promise<any> {
    return this.apiClient.get(`/bus/arrival/${stopId}`);
  }
}
