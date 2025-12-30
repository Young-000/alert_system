import { ApiClient } from './api-client';

export interface SubwayStation {
  stationId: string;
  stationName: string;
  lineName: string;
}

export interface SubwaySearchResult {
  stations: SubwayStation[];
}

export class SubwayApiClient {
  constructor(private apiClient: ApiClient) {}

  async searchStations(keyword: string): Promise<SubwaySearchResult> {
    return this.apiClient.get<SubwaySearchResult>(`/subway/stations/search?keyword=${encodeURIComponent(keyword)}`);
  }

  async getArrival(stationId: string): Promise<any> {
    return this.apiClient.get(`/subway/arrival/${stationId}`);
  }
}
