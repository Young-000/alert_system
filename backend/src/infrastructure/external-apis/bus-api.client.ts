import axios, { AxiosInstance } from 'axios';
import { BusArrival } from '@domain/entities/bus-arrival.entity';

export interface IBusApiClient {
  getBusArrival(stopId: string): Promise<BusArrival[]>;
}

interface BusArrivalApiItem {
  stId: string;
  busRouteId: string;
  busRouteNm?: string;  // Some endpoints use busRouteNm
  rtNm?: string;        // Some endpoints use rtNm
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
      timeout: 10000,
      params: {
        serviceKey: this.apiKey,
        resultType: 'json',
      },
    });
  }

  async getBusArrival(stopId: string): Promise<BusArrival[]> {
    try {
      // Use getArrInfoByStId to get all bus arrivals at a stop
      // (getArrInfoByRoute requires both stId and busRouteId)
      const response = await this.client.get<BusApiResponse>(
        '/getArrInfoByStId',
        {
          params: {
            stId: stopId,
          },
        },
      );

      const items = response.data.msgBody.itemList || [];
      return items.map((item: BusArrivalApiItem) => {
        const arrivalTime = this.parseArrivalTime(item.arrmsg1);
        // Handle both busRouteNm and rtNm field names from different endpoints
        const routeName = item.busRouteNm || item.rtNm || 'Unknown';
        return new BusArrival(
          item.stId,
          item.busRouteId,
          routeName,
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
