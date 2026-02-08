import { ApiClient } from './api-client';

export interface SubwayStation {
  id: string;
  name: string;
  line: string;
  code?: string;
}

export interface SubwayArrival {
  stationId: string;
  lineId: string;
  direction: string;
  arrivalTime: number;
  destination: string;
}

export class SubwayApiClient {
  constructor(private apiClient: ApiClient) {}

  async searchStations(query: string): Promise<SubwayStation[]> {
    return this.apiClient.get<SubwayStation[]>(`/subway/stations?query=${encodeURIComponent(query)}`);
  }

  async getArrival(stationName: string): Promise<SubwayArrival[]> {
    return this.apiClient.get<SubwayArrival[]>(`/subway/arrival/${encodeURIComponent(stationName)}`);
  }
}
