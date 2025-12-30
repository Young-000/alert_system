import { Inject } from '@nestjs/common';
import { ISubwayApiClient } from '@infrastructure/external-apis/subway-api.client';

export interface SubwayStation {
  stationId: string;
  stationName: string;
  lineName: string;
}

export class SearchSubwayStationsUseCase {
  constructor(@Inject('ISubwayApiClient') private subwayApiClient: ISubwayApiClient) {}

  async execute(keyword: string): Promise<SubwayStation[]> {
    // 실제 구현은 외부 API 클라이언트에 위임
    // 여기서는 예시로 빈 배열 반환 (실제로는 API 호출)
    return [];
  }
}
