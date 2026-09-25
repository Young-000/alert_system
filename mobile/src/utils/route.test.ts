import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  buildRouteSummary,
  getActiveRoute,
  getTimeContext,
  routeTypeForMode,
} from './route';

import type { RouteResponse } from '@/types/home';

function route(
  id: string,
  routeType: 'morning' | 'evening',
  isPreferred = false,
): RouteResponse {
  return {
    id,
    userId: 'u1',
    name: id,
    routeType,
    isPreferred,
    checkpoints: [],
    createdAt: '2026-09-25T00:00:00.000Z',
    updatedAt: '2026-09-25T00:00:00.000Z',
  };
}

/** 로컬 시각 기준 시(hour)를 고정한다 — `getActiveRoute`가 `getHours()`를 직접 읽는다. */
function atLocalHour(hour: number): void {
  vi.useFakeTimers();
  const now = new Date();
  now.setHours(hour, 0, 0, 0);
  vi.setSystemTime(now);
}

afterEach(() => {
  vi.useRealTimers();
});

describe('routeTypeForMode', () => {
  // 웹(`frontend/.../HomePage.tsx`)이 정본이다. 그쪽 useEffect 가
  // commute→morning · return→evening · 그 외→auto 로 맞춘다.
  it('출근 모드는 아침 경로를 고른다', () => {
    expect(routeTypeForMode('commute')).toBe('morning');
  });

  it('퇴근 모드는 저녁 경로를 고른다', () => {
    expect(routeTypeForMode('return')).toBe('evening');
  });

  it('야간 모드는 시각 자동 판정에 맡긴다', () => {
    expect(routeTypeForMode('night')).toBe('auto');
  });
});

describe('getActiveRoute — 모드 강제', () => {
  const routes = [route('아침', 'morning'), route('저녁', 'evening')];

  it('오전이어도 퇴근 모드면 저녁 경로를 돌려준다', () => {
    atLocalHour(9);
    expect(getActiveRoute(routes, 'evening')?.name).toBe('저녁');
  });

  it('오후여도 출근 모드면 아침 경로를 돌려준다', () => {
    atLocalHour(16);
    expect(getActiveRoute(routes, 'morning')?.name).toBe('아침');
  });

  it('auto 는 14시를 경계로 갈린다', () => {
    atLocalHour(13);
    expect(getActiveRoute(routes, 'auto')?.name).toBe('아침');
    atLocalHour(14);
    expect(getActiveRoute(routes, 'auto')?.name).toBe('저녁');
  });

  it('같은 유형이 여럿이면 선호 경로가 이긴다', () => {
    atLocalHour(9);
    const many = [route('아침A', 'morning'), route('아침B', 'morning', true)];
    expect(getActiveRoute(many, 'morning')?.name).toBe('아침B');
  });

  it('요청한 유형이 없으면 첫 경로로 떨어진다', () => {
    atLocalHour(9);
    expect(getActiveRoute([route('저녁', 'evening')], 'morning')?.name).toBe('저녁');
  });

  it('경로가 없으면 null', () => {
    expect(getActiveRoute([], 'morning')).toBeNull();
  });
});

describe('getTimeContext', () => {
  it('06~11시는 출근, 12~17시는 퇴근, 나머지는 내일', () => {
    expect(getTimeContext(6)).toBe('morning');
    expect(getTimeContext(11)).toBe('morning');
    expect(getTimeContext(12)).toBe('evening');
    expect(getTimeContext(17)).toBe('evening');
    expect(getTimeContext(18)).toBe('tomorrow');
    expect(getTimeContext(5)).toBe('tomorrow');
  });
});

describe('buildRouteSummary', () => {
  it('3곳 이하는 전부 나열한다', () => {
    expect(buildRouteSummary([{ name: '집' }, { name: '역' }, { name: '회사' }])).toBe(
      '집 -> 역 -> 회사',
    );
  });

  it('4곳 이상은 가운데를 접는다', () => {
    expect(
      buildRouteSummary([{ name: '집' }, { name: '버스' }, { name: '역' }, { name: '회사' }]),
    ).toBe('집 -> (2곳 경유) -> 회사');
  });

  it('빈 경로는 빈 문자열', () => {
    expect(buildRouteSummary([])).toBe('');
  });
});
