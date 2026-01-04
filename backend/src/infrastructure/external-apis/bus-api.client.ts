import axios, { AxiosInstance } from 'axios';
import { BusArrival } from '@domain/entities/bus-arrival.entity';

export interface IBusApiClient {
  getBusArrival(stopId: string): Promise<BusArrival[]>;
}

interface BusArrivalApiItem {
  stId: string;
  busRouteId: string;
  busRouteNm: string;
  arrmsg1: string;
  staOrd?: number;
}

interface BusApiResponse {
  msgBody: {
    itemList?: BusArrivalApiItem[];
  };
}

export class BusApiClient implements IBusApiClient {
  private client: AxiosInstance;

  constructor(private apiKey: string) {
    this.client = axios.create({
      baseURL: 'http://ws.bus.go.kr/api/rest/arrive',
      params: {
        serviceKey: this.apiKey,
        resultType: 'json',
      },
    });
  }

  async getBusArrival(stopId: string): Promise<BusArrival[]> {
    try {
      const response = await this.client.get<BusApiResponse>(
        '/getArrInfoByRoute',
        {
          params: {
            stId: stopId,
          },
        },
      );

      const items = response.data.msgBody.itemList || [];
      return items.map((item: BusArrivalApiItem) => {
        const arrivalTime = this.parseArrivalTime(item.arrmsg1);
        return new BusArrival(
          item.stId,
          item.busRouteId,
          item.busRouteNm,
          arrivalTime,
          item.staOrd || 0,
        );
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`버스 도착 정보를 가져오는데 실패했습니다: ${message}`);
    }
  }

  private parseArrivalTime(arrmsg: string): number {
    const match = arrmsg.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }
}
