import { Inject } from '@nestjs/common';
import { IBusApiClient } from '@infrastructure/external-apis/bus-api.client';

export interface BusStop {
  stopId: string;
  stopName: string;
  direction: string;
}

export class SearchBusStopsUseCase {
  constructor(@Inject('IBusApiClient') private busApiClient: IBusApiClient) {}

  async execute(keyword: string): Promise<BusStop[]> {
    // 실제 구현은 외부 API 클라이언트에 위임
    // 여기서는 예시로 빈 배열 반환 (실제로는 API 호출)
    return [];
  }
}
