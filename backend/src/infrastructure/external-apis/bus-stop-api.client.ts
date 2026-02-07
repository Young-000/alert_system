import axios, { AxiosInstance } from 'axios';
import { BusStop } from '@domain/entities/bus-stop.entity';

export interface IBusStopApiClient {
  searchBusStops(query: string, limit?: number): Promise<BusStop[]>;
}

interface BusStopApiItem {
  STOPS_NO: string;
  STOPS_NM: string;
  NODE_ID: string;
  STOPS_TYPE: string;
  XCRD: string;
  YCRD: string;
}

interface BusStopApiResponse {
  busStopLocationXyInfo: {
    list_total_count: number;
    RESULT: { CODE: string; MESSAGE: string };
    row: BusStopApiItem[];
  };
}

export class BusStopApiClient implements IBusStopApiClient {
  private client: AxiosInstance;
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.SUBWAY_API_KEY || '';
    this.client = axios.create({
      baseURL: 'http://openapi.seoul.go.kr:8088',
      timeout: 10000,
    });
  }

  async searchBusStops(query: string, limit = 20): Promise<BusStop[]> {
    if (!query || query.trim().length < 2) {
      return [];
    }

    try {
      const response = await this.client.get<BusStopApiResponse>(
        `/${this.apiKey}/json/busStopLocationXyInfo/1/${limit}/${encodeURIComponent(query)}`,
      );

      const data = response.data.busStopLocationXyInfo;
      if (data.RESULT.CODE !== 'INFO-000') {
        return [];
      }

      return data.row.map(
        (item) =>
          new BusStop(
            item.STOPS_NO,
            item.STOPS_NM,
            item.NODE_ID,
            item.STOPS_TYPE,
            parseFloat(item.XCRD),
            parseFloat(item.YCRD),
          ),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`버스 정류장 검색에 실패했습니다: ${message}`);
    }
  }
}
