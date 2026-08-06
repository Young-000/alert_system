import { describe, it, expect } from 'vitest';
import { generateSchedule, generateAlertName, getNotificationTimes } from './alert-utils';
import type { Routine, TransportItem } from './types';

const SUBWAY: TransportItem = {
  type: 'subway',
  id: 'S1',
  name: '강남역',
  detail: '2호선',
};

function routine(overrides: Partial<Routine> = {}): Routine {
  return { wakeUp: '07:00', leaveHome: '08:00', leaveWork: '18:00', ...overrides };
}

/**
 * cron의 분 필드는 모든 시각에 공통 적용된다 (cron-utils.ts 참고).
 * 그래서 미리보기가 약속한 시각은 반드시 크론이 실제로 발화하는 시각이어야 한다.
 */
function cronFiringTimes(cron: string): string[] {
  const [minuteField, hourField] = cron.trim().split(/\s+/);
  const minute = Number(minuteField);
  return hourField
    .split(',')
    .map((h) => `${String(Number(h)).padStart(2, '0')}:${String(minute).padStart(2, '0')}`);
}

describe('generateSchedule — 미리보기와 실제 예약 시각의 일치', () => {
  it('기상 시각의 분을 버리지 않는다', () => {
    const cron = generateSchedule(true, false, routine({ wakeUp: '07:30' }));
    expect(cron).toBe('30 7 * * *');
  });

  it('출발 15분 전 계산에서 분을 보존한다 (08:10 출발 → 07:55 알림)', () => {
    const cron = generateSchedule(false, true, routine({ leaveHome: '08:10', leaveWork: '18:10' }));
    expect(cronFiringTimes(cron)).toContain('07:55');
  });

  it('자정을 넘겨 당겨지면 00:00으로 고정한다', () => {
    const cron = generateSchedule(false, true, routine({ leaveHome: '00:05', leaveWork: '18:00' }));
    expect(cronFiringTimes(cron)).toContain('00:00');
  });
});

describe('getNotificationTimes — 화면에 약속한 시각', () => {
  it('미리보기 시각이 전부 실제 발화 시각에 들어 있다 (날씨만)', () => {
    const r = routine({ wakeUp: '07:30' });
    const firing = cronFiringTimes(generateSchedule(true, false, r));
    const preview = getNotificationTimes(true, false, r, []);

    expect(preview).toHaveLength(1);
    for (const item of preview) {
      expect(firing).toContain(item.time);
    }
  });

  it('미리보기 시각이 전부 실제 발화 시각에 들어 있다 (날씨 + 교통)', () => {
    const r = routine({ wakeUp: '07:45', leaveHome: '08:30', leaveWork: '19:20' });
    const firing = cronFiringTimes(generateSchedule(true, true, r));
    const preview = getNotificationTimes(true, true, r, [SUBWAY]);

    expect(preview).toHaveLength(3);
    for (const item of preview) {
      expect(firing).toContain(item.time);
    }
  });

  it('시각 입력이 비어 있어도 NaN을 화면에 내보내지 않는다', () => {
    const preview = getNotificationTimes(true, true, routine({ wakeUp: '', leaveHome: '' }), [
      SUBWAY,
    ]);

    for (const item of preview) {
      expect(item.time).not.toContain('NaN');
    }
  });

  it('시각 순으로 정렬한다', () => {
    const r = routine({ wakeUp: '07:00', leaveHome: '08:30', leaveWork: '19:00' });
    const times = getNotificationTimes(true, true, r, [SUBWAY]).map((t) => t.time);

    expect([...times].sort()).toEqual(times);
  });
});

describe('generateAlertName', () => {
  it('교통수단이 하나면 그 이름을 쓴다', () => {
    expect(generateAlertName(false, [SUBWAY])).toBe('강남역 알림');
  });

  it('교통수단이 여럿이면 외 N곳으로 줄인다', () => {
    expect(generateAlertName(false, [SUBWAY, { ...SUBWAY, id: 'S2', name: '역삼역' }])).toBe(
      '강남역 외 1곳 알림',
    );
  });

  it('날씨만 선택하면 날씨 알림이다', () => {
    expect(generateAlertName(true, [])).toBe('날씨 알림');
  });

  it('아무것도 없으면 기본 이름을 쓴다', () => {
    expect(generateAlertName(false, [])).toBe('출퇴근 알림');
  });
});
