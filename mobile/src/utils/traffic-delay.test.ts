import { describe, expect, it } from 'vitest';

import { resolveTrafficDelay } from './traffic-delay';

describe('resolveTrafficDelay', () => {
  it('보정값이 없으면 지연이 아니다', () => {
    expect(resolveTrafficDelay(undefined)).toEqual({ hasTrafficDelay: false });
  });

  it('보정값 0은 지연이 아니다', () => {
    expect(resolveTrafficDelay(0)).toEqual({ hasTrafficDelay: false });
  });

  it('1분 지연도 지연으로 본다 — 서버(위젯)와 같은 기준', () => {
    // 이전 구현은 `> 5`라 1~5분 구간에서 위젯은 "지연", Live Activity는 "정상"이었다.
    expect(resolveTrafficDelay(1)).toEqual({
      hasTrafficDelay: true,
      trafficDelayMessage: '+1분 지연',
    });
  });

  it.each([2, 3, 4, 5])('%i분 지연 구간이 위젯과 갈리지 않는다', (min) => {
    expect(resolveTrafficDelay(min).hasTrafficDelay).toBe(true);
  });

  it('6분 이상도 그대로 지연이다', () => {
    expect(resolveTrafficDelay(12)).toEqual({
      hasTrafficDelay: true,
      trafficDelayMessage: '+12분 지연',
    });
  });

  it('음수 보정(교통 원활)은 지연이 아니고 문구도 없다', () => {
    // 이전 구현은 `+${-4}분 지연` → "+-4분 지연"이라는 문구를 만들었다.
    const result = resolveTrafficDelay(-4);
    expect(result.hasTrafficDelay).toBe(false);
    expect(result.trafficDelayMessage).toBeUndefined();
  });

  it('지연이 아닐 때 문구는 항상 undefined다', () => {
    for (const min of [undefined, -10, -1, 0]) {
      expect(resolveTrafficDelay(min).trafficDelayMessage).toBeUndefined();
    }
  });
});
