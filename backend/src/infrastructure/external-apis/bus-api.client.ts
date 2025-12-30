import axios, { AxiosInstance } from 'axios';
import { BusArrival } from '@domain/entities/bus-arrival.entity';

export interface IBusApiClient {
  getBusArrival(stopId: string): Promise<BusArrival[]>;
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
      const response = await this.client.get('/getArrInfoByRoute', {
        params: {
          stId: stopId,
        },
      });

      const items = response.data.msgBody.itemList || [];
      return items.map((item: any) => {
        const arrivalTime = this.parseArrivalTime(item.arrmsg1);
        return new BusArrival(
          item.stId,
          item.busRouteId,
          item.busRouteNm,
          arrivalTime,
          item.staOrd || 0
        );
      });
    } catch (error) {
      throw new Error(`Failed to fetch bus arrival: ${error}`);
    }
  }

  private parseArrivalTime(arrmsg: string): number {
    const match = arrmsg.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }
}

