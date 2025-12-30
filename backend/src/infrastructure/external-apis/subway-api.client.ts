import axios, { AxiosInstance } from 'axios';
import { SubwayArrival } from '@domain/entities/subway-arrival.entity';

export interface ISubwayApiClient {
  getSubwayArrival(stationId: string): Promise<SubwayArrival[]>;
}

export class SubwayApiClient implements ISubwayApiClient {
  private client: AxiosInstance;

  constructor(private apiKey: string) {
    this.client = axios.create({
      baseURL: 'http://swopenAPI.seoul.go.kr/api/subway',
      params: {
        serviceKey: this.apiKey,
        resultType: 'json',
      },
    });
  }

  async getSubwayArrival(stationId: string): Promise<SubwayArrival[]> {
    try {
      const response = await this.client.get(`/sample/json/realtimeStationArrival/0/5/${stationId}`);

      const items = response.data.realtimeArrivalList || [];
      return items.map((item: any) => {
        const arrivalTime = this.parseArrivalTime(item.arvlMsg2);
        return new SubwayArrival(
          item.statnId,
          item.subwayId,
          item.updnLine,
          arrivalTime,
          item.bstatnNm
        );
      });
    } catch (error) {
      throw new Error(`Failed to fetch subway arrival: ${error}`);
    }
  }

  private parseArrivalTime(arvlMsg: string): number {
    const match = arvlMsg.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }
}

