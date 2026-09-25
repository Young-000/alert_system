import { describe, expect, it } from 'vitest';

import { modeBadgeActionHint, nextManualMode } from './commute-mode';

import type { CommuteMode } from '@/hooks/useCommuteMode';

/**
 * 배지를 N번 탭했을 때의 수동 지정값을 재생한다.
 * `autoMode`는 시각이 바뀌지 않는 한 고정이므로 상수로 둔다.
 */
function tapTimes(count: number, autoMode: CommuteMode): (CommuteMode | null)[] {
  const states: (CommuteMode | null)[] = [];
  let manual: CommuteMode | null = null;
  for (let i = 0; i < count; i += 1) {
    manual = nextManualMode(manual, autoMode);
    states.push(manual);
  }
  return states;
}

describe('nextManualMode', () => {
  it('자동 상태에서 탭하면 반대 방향을 수동으로 지정한다', () => {
    expect(nextManualMode(null, 'commute')).toBe('return');
    expect(nextManualMode(null, 'return')).toBe('commute');
  });

  // 야간에는 "내일 출근 대기"가 자동값이다. 여기서 탭하면 출근길을 미리 본다.
  it('야간 자동 상태에서 탭하면 출근을 수동으로 지정한다', () => {
    expect(nextManualMode(null, 'night')).toBe('commute');
  });

  // 🔴 이 축이 결함이었다. 수동 지정이 한 번 켜지면 되돌릴 경로가 없어
  // 시각 기반 자동 판정이 화면 수명 동안 영구히 죽었다.
  it('수동 상태에서 탭하면 자동으로 돌아간다', () => {
    expect(nextManualMode('return', 'commute')).toBeNull();
    expect(nextManualMode('commute', 'return')).toBeNull();
  });

  it('두 번 탭하면 자동 상태로 복귀한다 (래치가 남지 않는다)', () => {
    expect(tapTimes(2, 'commute')).toEqual(['return', null]);
  });

  it('계속 탭해도 자동↔수동 두 상태만 오간다', () => {
    expect(tapTimes(5, 'return')).toEqual([
      'commute',
      null,
      'commute',
      null,
      'commute',
    ]);
  });

  it('야간 자동값도 탭 두 번이면 다시 도달한다', () => {
    expect(tapTimes(2, 'night')).toEqual(['commute', null]);
  });
});

describe('modeBadgeActionHint', () => {
  // 원칙 1(Predictable hint): 누르면 무엇이 되는지 말한다.
  it('자동 상태에서는 전환된다고 알린다', () => {
    expect(modeBadgeActionHint(false)).toBe('탭하여 전환');
  });

  it('수동 상태에서는 자동으로 돌아간다고 알린다', () => {
    expect(modeBadgeActionHint(true)).toBe('탭하여 자동으로 돌아가기');
  });
});
