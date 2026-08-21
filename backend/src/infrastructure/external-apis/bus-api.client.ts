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

  // 도메인 계약: 도착 시각은 "초" 단위다. 소비자들이 여기에 기대고 있다 —
  // notification-message-builder.formatArrivalTime(seconds),
  // widget-data.service(arrivalTime / 60), route-delay-check(shortestArrivalSeconds),
  // send-notification(DELAY_THRESHOLD_SECONDS = 600).
  // 앞의 아무 숫자나 집으면 "[2번째 전]"(남은 정류장 수)까지 시간으로 읽힌다.
  private parseArrivalTime(arrmsg: string): number {
    if (!arrmsg) return 0;

    const minutes = arrmsg.match(/(\d+)\s*분/);
    const seconds = arrmsg.match(/(\d+)\s*초/);
    if (!minutes && !seconds) return 0;

    return (
      (minutes ? parseInt(minutes[1], 10) * 60 : 0) +
      (seconds ? parseInt(seconds[1], 10) : 0)
    );
  }
}
