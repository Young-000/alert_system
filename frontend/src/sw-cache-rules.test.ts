import { describe, it, expect } from 'vitest';
import { isCacheableApiPath } from './sw-cache-rules';

describe('isCacheableApiPath', () => {
  // 백엔드에 전역 prefix가 없다 — 컨트롤러 경로가 그대로 URL 경로가 된다.
  // 프론트가 실제로 부르는 경로를 그대로 적어둔다 (api client와 대조해 확인한 값).
  it.each([
    '/weather/current',
    '/air-quality/location',
    '/subway/stations',
    '/bus/stops',
  ])('캐시한다: %s', (pathname) => {
    expect(isCacheableApiPath(pathname)).toBe(true);
  });

  // 도착 정보는 실시간이라 캐시하면 지난 시각을 최신인 양 보여준다.
  it.each([
    '/subway/arrival/강남',
    '/bus/arrival/12345',
  ])('캐시하지 않는다 — 실시간 도착 정보: %s', (pathname) => {
    expect(isCacheableApiPath(pathname)).toBe(false);
  });

  // 존재하지 않는 접두사를 매칭하면 캐시 규칙이 통째로 죽는다 (2026-08-12 발견 결함).
  it('존재하지 않는 /api 접두사 경로는 매칭하지 않는다', () => {
    expect(isCacheableApiPath('/api/weather/current')).toBe(false);
  });

  it('사용자별 데이터 경로는 캐시하지 않는다', () => {
    expect(isCacheableApiPath('/commute/history/user-1')).toBe(false);
    expect(isCacheableApiPath('/alerts')).toBe(false);
  });
});
