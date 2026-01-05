import axios, { AxiosInstance } from 'axios';
import { SubwayArrival } from '@domain/entities/subway-arrival.entity';

export interface ISubwayApiClient {
  getSubwayArrival(stationName: string): Promise<SubwayArrival[]>;
}

interface SubwayArrivalApiItem {
  statnId: string;
  subwayId: string;
  updnLine: string;
  arvlMsg2: string;
  bstatnNm: string;
}

interface SubwayApiResponse {
  realtimeArrivalList?: SubwayArrivalApiItem[];
}

export class SubwayApiClient implements ISubwayApiClient {
  private client: AxiosInstance;
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.SUBWAY_REALTIME_API_KEY || '';
    this.client = axios.create({
      baseURL: 'http://swopenAPI.seoul.go.kr/api/subway',
    });
  }

  async getSubwayArrival(stationName: string): Promise<SubwayArrival[]> {
    try {
      const response = await this.client.get<SubwayApiResponse>(
        `/${this.apiKey}/json/realtimeStationArrival/0/5/${encodeURIComponent(stationName)}`,
      );

      const items = response.data.realtimeArrivalList || [];
      return items.map((item: SubwayArrivalApiItem) => {
        const arrivalTime = this.parseArrivalTime(item.arvlMsg2);
        return new SubwayArrival(
          item.statnId,
          item.subwayId,
          item.updnLine,
          arrivalTime,
          item.bstatnNm,
        );
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`지하철 도착 정보를 가져오는데 실패했습니다: ${message}`);
    }
  }

  private parseArrivalTime(arvlMsg: string): number {
    const match = arvlMsg.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }
}
