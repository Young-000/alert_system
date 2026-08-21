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
      timeout: 10000,
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

  // 도메인 계약: 도착 시각은 "초" 단위다. 소비자들이 여기에 기대고 있다 —
  // notification-message-builder.formatArrivalTime(seconds),
  // widget-data.service(arrivalTime / 60), route-delay-check(shortestArrivalSeconds),
  // send-notification(DELAY_THRESHOLD_SECONDS = 600).
  // 앞의 아무 숫자나 집으면 "[2번째 전]"(남은 정류장 수)까지 시간으로 읽힌다.
  private parseArrivalTime(arvlMsg: string): number {
    if (!arvlMsg) return 0;

    const minutes = arvlMsg.match(/(\d+)\s*분/);
    const seconds = arvlMsg.match(/(\d+)\s*초/);
    if (!minutes && !seconds) return 0;

    return (
      (minutes ? parseInt(minutes[1], 10) * 60 : 0) +
      (seconds ? parseInt(seconds[1], 10) : 0)
    );
  }
}
