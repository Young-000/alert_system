import { describe, it, expect } from 'vitest';
import { getVisibleTabs, resolveActiveTab } from './visible-tabs';
import type { TabId } from './use-commute-dashboard';

type Args = Parameters<typeof getVisibleTabs>[0];

function makeArgs(overrides: Partial<Args> = {}): Args {
  return {
    stats: null,
    stopwatchRecords: [],
    routeAnalytics: [],
    behaviorAnalytics: null,
    ...overrides,
  };
}

// 탭 가시성 판정에 필요한 필드만 채운다
const statsWith = (totalSessions: number): Args['stats'] =>
  ({ totalSessions }) as Args['stats'];

describe('getVisibleTabs', () => {
  it('세션 기록이 있으면 요약·경로·기록 탭이 보인다', () => {
    const tabs = getVisibleTabs(makeArgs({ stats: statsWith(3) }));
    expect(tabs).toEqual(['overview', 'routes', 'history']);
  });

  it('세션이 0이면 요약·경로·기록 탭이 사라진다', () => {
    const tabs = getVisibleTabs(makeArgs({ stats: statsWith(0) }));
    expect(tabs).toEqual([]);
  });

  it('스톱워치 기록이 있으면 스톱워치 탭이 보인다', () => {
    const tabs = getVisibleTabs(
      makeArgs({ stopwatchRecords: [{ id: 'r1' }] as Args['stopwatchRecords'] }),
    );
    expect(tabs).toEqual(['stopwatch']);
  });

  it('행동 데이터가 충분할 때만 행동 패턴 탭이 보인다', () => {
    const notEnough = getVisibleTabs(
      makeArgs({ behaviorAnalytics: { hasEnoughData: false } as Args['behaviorAnalytics'] }),
    );
    expect(notEnough).not.toContain('behavior');

    const enough = getVisibleTabs(
      makeArgs({ behaviorAnalytics: { hasEnoughData: true } as Args['behaviorAnalytics'] }),
    );
    expect(enough).toContain('behavior');
  });

  it('보이는 탭이 하나도 없을 수 있다', () => {
    expect(getVisibleTabs(makeArgs())).toEqual([]);
  });
});

describe('resolveActiveTab', () => {
  it('요청한 탭이 보이면 그대로 쓴다', () => {
    expect(resolveActiveTab('history', ['overview', 'routes', 'history'])).toBe('history');
  });

  it('요청한 탭이 보이지 않으면 첫 번째 보이는 탭으로 넘어간다', () => {
    // 스톱워치만 쓴 사용자는 세션 통계가 없어 overview 탭 자체가 렌더되지 않는다.
    // 그대로 두면 탭 하나만 있고 본문이 빈 화면이 된다.
    expect(resolveActiveTab('overview', ['stopwatch'])).toBe('stopwatch');
  });

  it('보이는 탭이 없으면 요청한 탭을 유지한다', () => {
    // 이 경우 페이지가 탭 대신 빈 상태 화면을 그린다 — 임의로 바꾸지 않는다.
    expect(resolveActiveTab('overview', [])).toBe('overview');
  });

  it('탭 목록이 늦게 도착해도 결국 보이는 탭을 고른다', () => {
    const requested: TabId = 'behavior';
    expect(resolveActiveTab(requested, ['overview', 'routes', 'history'])).toBe('overview');
  });
});
