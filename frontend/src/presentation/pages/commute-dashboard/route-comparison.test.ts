import { describe, it, expect } from 'vitest';
import {
  selectComparableRouteIds,
  MIN_COMPARE_ROUTES,
  MAX_COMPARE_ROUTES,
} from './route-comparison';

describe('selectComparableRouteIds', () => {
  const ids = (count: number): string[] =>
    Array.from({ length: count }, (_, i) => `route-${i + 1}`);

  it('경로가 1개 이하면 비교하지 않는다', () => {
    expect(selectComparableRouteIds([])).toBeNull();
    expect(selectComparableRouteIds(ids(1))).toBeNull();
  });

  it('2~5개는 그대로 비교한다', () => {
    expect(selectComparableRouteIds(ids(2))).toEqual(['route-1', 'route-2']);
    expect(selectComparableRouteIds(ids(5))).toHaveLength(MAX_COMPARE_ROUTES);
  });

  // 서버는 6개 이상을 400으로 거절한다. 잘라 보내지 않으면 경로를 6개 이상
  // 저장한 사용자는 대시보드 비교 카드가 영영 에러 문구로 남는다.
  it('6개 이상이면 상한까지만 잘라서 비교한다', () => {
    const result = selectComparableRouteIds(ids(6));

    expect(result).toHaveLength(MAX_COMPARE_ROUTES);
    expect(result).toEqual(['route-1', 'route-2', 'route-3', 'route-4', 'route-5']);
  });

  it('상한을 넘겨도 앞선 경로 순서를 보존한다', () => {
    expect(selectComparableRouteIds(ids(12))?.[0]).toBe('route-1');
  });

  it('빈 id는 제외한다', () => {
    expect(selectComparableRouteIds(['route-1', '', ' ', 'route-2'])).toEqual([
      'route-1',
      'route-2',
    ]);
  });

  it('빈 id를 걸러낸 뒤 최소 개수에 못 미치면 비교하지 않는다', () => {
    expect(selectComparableRouteIds(['route-1', ''])).toBeNull();
  });

  it('서버 계약과 같은 범위를 쓴다', () => {
    expect(MIN_COMPARE_ROUTES).toBe(2);
    expect(MAX_COMPARE_ROUTES).toBe(5);
  });
});
