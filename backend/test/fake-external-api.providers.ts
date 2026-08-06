import { Provider } from '@nestjs/common';
import { AirQuality } from '../src/domain/entities/air-quality.entity';
import { BusStop } from '../src/domain/entities/bus-stop.entity';
import { IAirQualityApiClient } from '../src/infrastructure/external-apis/air-quality-api.client';
import { IBusStopApiClient } from '../src/infrastructure/external-apis/bus-stop-api.client';

/**
 * E2E용 외부 API 대역(fake).
 *
 * 실제 클라이언트는 공공데이터포털/서울시 API를 호출하므로 테스트에 서비스키가 없으면
 * 401·Unknown error로 실패한다. 키를 넣더라도 e2e가 외부 네트워크와 일일 쿼터에
 * 의존하게 되므로 넣지 않는다 — 대신 결정적인 응답을 돌려주는 대역을 주입한다.
 *
 * 컨트롤러 → 유스케이스 → 도메인 변환 경로는 그대로 검증되고,
 * 외부 HTTP 파싱 자체는 각 클라이언트의 단위 테스트가 담당한다.
 */

export class FakeAirQualityApiClient implements IAirQualityApiClient {
  async getAirQuality(lat: number, lng: number): Promise<AirQuality> {
    // 좌표에서 결정적으로 값을 만들어 캐시 적중 여부도 관측 가능하게 한다.
    const pm10 = 30 + (Math.abs(Math.round(lat)) % 10);
    const pm25 = 15 + (Math.abs(Math.round(lng)) % 10);
    return new AirQuality('서울', pm10, pm25, pm10 * 2, '보통');
  }
}

export class FakeBusStopApiClient implements IBusStopApiClient {
  async searchBusStops(query: string, limit = 10): Promise<BusStop[]> {
    const normalized = query.trim();
    if (!normalized) return [];

    return [
      new BusStop('23-001', `${normalized}정류장`, 'NODE_1', '일반', 127.0, 37.5),
      new BusStop('23-002', `${normalized}사거리`, 'NODE_2', '일반', 127.1, 37.6),
    ].slice(0, limit);
  }
}

export const fakeExternalApiProviders: Provider[] = [
  { provide: 'IAirQualityApiClient', useClass: FakeAirQualityApiClient },
  { provide: 'IBusStopApiClient', useClass: FakeBusStopApiClient },
];
