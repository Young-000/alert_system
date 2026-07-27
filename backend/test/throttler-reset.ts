import { INestApplication } from '@nestjs/common';
import { ThrottlerStorage, ThrottlerStorageService } from '@nestjs/throttler';

/**
 * ThrottlerStorageService의 내부 타이머 핸들.
 * 스토리지 Map만 비우면 이미 예약된 타이머가 사라진 키를 조회해 터지므로 함께 정리해야 한다.
 */
type ThrottlerStorageInternals = {
  timeoutIds?: Map<string, NodeJS.Timeout[]>;
};

/**
 * 테스트 간 rate limit 누적을 제거한다.
 *
 * `/auth/register`(3회/분), `/auth/login`(5회/분)은 컨트롤러 데코레이터라
 * TestAppModule의 완화된 전역 설정(1000회)을 덮어쓴다. 리셋하지 않으면 한 스위트가
 * 유저를 3명 넘게 만드는 순간부터 이후 모든 테스트가 429로 무너진다.
 *
 * 스로틀러를 끄는 대신 리셋하는 이유: 429 자체를 검증하는 테스트가 존재한다
 * (`app.e2e-spec.ts`, `auth.e2e-spec.ts`). 각 테스트는 자기 요청 버스트를 그대로 관측한다.
 */
export function resetThrottler(app: INestApplication): void {
  const storage = app.get<ThrottlerStorageService>(ThrottlerStorage, {
    strict: false,
  });
  if (!storage) return;

  const { timeoutIds } = storage as unknown as ThrottlerStorageInternals;
  timeoutIds?.forEach((ids) => ids.forEach((id) => clearTimeout(id)));
  timeoutIds?.clear();

  storage.storage?.clear();
}
