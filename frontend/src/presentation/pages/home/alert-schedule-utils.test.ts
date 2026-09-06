import { computeNextAlert } from './alert-schedule-utils';
import type { Alert } from '@infrastructure/api';

function buildAlert(overrides: Partial<Alert> = {}): Alert {
  return {
    id: 'alert-1',
    userId: 'user-1',
    name: 'Test Alert',
    schedule: '0 8 * * *',
    alertTypes: ['weather'],
    enabled: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  } as Alert;
}

describe('computeNextAlert', () => {
  it('returns null for empty alerts array', () => {
    expect(computeNextAlert([])).toBeNull();
  });

  it('returns null when all alerts are disabled', () => {
    const alerts = [buildAlert({ enabled: false })];
    expect(computeNextAlert(alerts)).toBeNull();
  });

  it('returns today time when alert is in the future', () => {
    const now = new Date(2026, 1, 17, 7, 0); // 7:00 AM
    const alerts = [buildAlert({ schedule: '30 8 * * *' })]; // 8:30
    const result = computeNextAlert(alerts, now);
    expect(result).toEqual({ time: '08:30', label: '날씨' });
  });

  it('returns "내일" prefix when alert is in the past today', () => {
    const now = new Date(2026, 1, 17, 10, 0); // 10:00 AM
    const alerts = [buildAlert({ schedule: '0 8 * * *' })]; // 8:00
    const result = computeNextAlert(alerts, now);
    expect(result).toEqual({ time: '내일 08:00', label: '날씨' });
  });

  it('picks the nearest future alert from multiple alerts', () => {
    const now = new Date(2026, 1, 17, 7, 0); // 7:00 AM
    const alerts = [
      buildAlert({ id: 'a1', schedule: '0 18 * * *', alertTypes: ['bus'] }), // 18:00 교통
      buildAlert({ id: 'a2', schedule: '30 7 * * *', alertTypes: ['weather'] }), // 07:30 날씨
    ];
    const result = computeNextAlert(alerts, now);
    expect(result).toEqual({ time: '07:30', label: '날씨' });
  });

  it('handles comma-separated hours in schedule', () => {
    const now = new Date(2026, 1, 17, 9, 0); // 9:00 AM
    const alerts = [buildAlert({ schedule: '0 8,12,18 * * *' })]; // 8:00, 12:00, 18:00
    const result = computeNextAlert(alerts, now);
    expect(result).toEqual({ time: '12:00', label: '날씨' });
  });

  it('returns 교통 label for non-weather alert types', () => {
    const now = new Date(2026, 1, 17, 7, 0);
    const alerts = [buildAlert({ schedule: '0 8 * * *', alertTypes: ['bus', 'subway'] })];
    const result = computeNextAlert(alerts, now);
    expect(result).toEqual({ time: '08:00', label: '교통' });
  });

  it('prefers today alert over tomorrow alert', () => {
    const now = new Date(2026, 1, 17, 12, 0); // noon
    const alerts = [
      buildAlert({ id: 'a1', schedule: '0 7 * * *' }),  // 7:00 (past today → tomorrow)
      buildAlert({ id: 'a2', schedule: '0 14 * * *' }), // 14:00 (future today)
    ];
    const result = computeNextAlert(alerts, now);
    expect(result).toEqual({ time: '14:00', label: '날씨' });
  });

  it('handles non-numeric cron minute gracefully', () => {
    const now = new Date(2026, 1, 17, 7, 0);
    const alerts = [buildAlert({ schedule: '* 8 * * *' })]; // '*' minute → defaults to 0
    const result = computeNextAlert(alerts, now);
    expect(result).toEqual({ time: '08:00', label: '날씨' });
  });

  it('skips alerts with less than 2 schedule parts', () => {
    const now = new Date(2026, 1, 17, 7, 0);
    const alerts = [buildAlert({ schedule: '30' })]; // invalid
    expect(computeNextAlert(alerts, now)).toBeNull();
  });

  it('pads single-digit hours and minutes', () => {
    const now = new Date(2026, 1, 17, 5, 0);
    const alerts = [buildAlert({ schedule: '5 6 * * *' })]; // 6:05
    const result = computeNextAlert(alerts, now);
    expect(result).toEqual({ time: '06:05', label: '날씨' });
  });

  // ── cron 요일 필드 반영 ──
  // EventBridge는 요일을 그대로 실제 스케줄로 옮긴다. 요일을 무시하면
  // 홈 화면이 "발화하지 않는 날"을 다음 알림으로 단언하게 된다.
  describe('day-of-week 필드', () => {
    const SATURDAY_10AM = new Date(2026, 7, 1, 10, 0); // 2026-08-01 (토) 10:00
    const MONDAY_7AM = new Date(2026, 7, 3, 7, 0); // 2026-08-03 (월) 07:00

    it('평일 전용 알림은 토요일에 "내일"(일요일)이라 하지 않는다', () => {
      const alerts = [buildAlert({ schedule: '0 8 * * 1-5' })];
      const result = computeNextAlert(alerts, SATURDAY_10AM);
      expect(result).toEqual({ time: '월 08:00', label: '날씨' });
    });

    it('주말 전용 알림은 월요일에 오늘이라 하지 않는다', () => {
      const alerts = [buildAlert({ schedule: '0 9 * * 0,6' })];
      const result = computeNextAlert(alerts, MONDAY_7AM);
      expect(result).toEqual({ time: '토 09:00', label: '날씨' });
    });

    it('평일 알림은 평일 아침이면 오늘로 표시한다', () => {
      const alerts = [buildAlert({ schedule: '0 8 * * 1-5' })];
      const result = computeNextAlert(alerts, MONDAY_7AM);
      expect(result).toEqual({ time: '08:00', label: '날씨' });
    });

    it('평일 알림은 금요일 저녁이면 다음 발화가 월요일이다', () => {
      const fridayEvening = new Date(2026, 7, 7, 20, 0); // 2026-08-07 (금) 20:00
      const alerts = [buildAlert({ schedule: '0 8 * * 1-5' })];
      const result = computeNextAlert(alerts, fridayEvening);
      expect(result).toEqual({ time: '월 08:00', label: '날씨' });
    });

    it('주 1회 알림은 그날 시각이 지나도 다음 주 발화를 알려준다', () => {
      // '0 8 * * 1' = 월요일에만 울리는 알림. 월요일 09:00에는 오늘 발화가 끝났고
      // 다음 발화는 7일 뒤다. offset 6까지만 훑으면 활성일을 못 찾아 null이 되고,
      // 홈 화면의 "다음 알림"이 통째로 사라진다.
      const mondayAfterAlert = new Date(2026, 7, 3, 9, 0); // 2026-08-03 (월) 09:00
      const alerts = [buildAlert({ schedule: '0 8 * * 1' })];
      const result = computeNextAlert(alerts, mondayAfterAlert);
      expect(result).toEqual({ time: '다음 주 월 08:00', label: '날씨' });
    });

    it('요일이 다른 알림들 중 실제로 가장 먼저 발화하는 것을 고른다', () => {
      const alerts = [
        buildAlert({ id: 'a1', schedule: '0 7 * * 1-5', alertTypes: ['weather'] }), // → 월 07:00
        buildAlert({ id: 'a2', schedule: '0 18 * * 0,6', alertTypes: ['bus'] }), // → 오늘(토) 18:00
      ];
      const result = computeNextAlert(alerts, SATURDAY_10AM);
      expect(result).toEqual({ time: '18:00', label: '교통' });
    });
  });
});

// ── 폼이 만들지 않는 스케줄 (2026-09-07 auto-review) ──────────────
//
// 백엔드는 `CronExpressionParser.parse`를 통과하는 **모든** cron을 받는다
// (`create-alert.dto.ts:31`). 폼이 만드는 `M H * * D` 말고도 범위·스텝이
// 저장될 수 있고, 같은 리포의 `cron-utils.ts`는 이미 그 경우를 전제로
// 방어한다(`normalizeCronForComparison`·`applyTimeToCron`).
describe('computeNextAlert — 폼 밖 스케줄', () => {
  it('공백이 겹쳐도 시각을 옳게 읽는다', () => {
    const now = new Date(2026, 1, 17, 6, 0);
    // `split(' ')`은 시각 필드를 빈 문자열로 잡아 `Number('')`=0으로 읽었다.
    const alerts = [buildAlert({ schedule: '30  8  *  *  *' })];
    expect(computeNextAlert(alerts, now)?.time).toBe('08:30');
  });

  it('분이 범위면 시작 분부터 울린다', () => {
    const now = new Date(2026, 1, 17, 6, 0);
    // 07:10부터 울리는데 분을 못 읽어 0으로 때우면 "07:00"이라고 예고한다.
    const alerts = [buildAlert({ schedule: '10-30 7 * * *' })];
    expect(computeNextAlert(alerts, now)?.time).toBe('07:10');
  });

  it('분이 목록이면 가장 이른 분을 쓴다', () => {
    const now = new Date(2026, 1, 17, 6, 0);
    const alerts = [buildAlert({ schedule: '45,15 7 * * *' })];
    expect(computeNextAlert(alerts, now)?.time).toBe('07:15');
  });

  it('분이 스텝이면 0분부터 울린다', () => {
    const now = new Date(2026, 1, 17, 6, 0);
    const alerts = [buildAlert({ schedule: '*/5 7 * * *' })];
    expect(computeNextAlert(alerts, now)?.time).toBe('07:00');
  });

  it('필드가 5개가 아니면 읽지 않는다', () => {
    const now = new Date(2026, 1, 17, 6, 0);
    expect(computeNextAlert([buildAlert({ schedule: '0 7' })], now)).toBeNull();
  });

  it('시각이 범위인 알림은 지어내지 않고 건너뛴다', () => {
    const now = new Date(2026, 1, 17, 6, 0);
    const alerts = [buildAlert({ schedule: '0 7-9 * * *' })];
    expect(computeNextAlert(alerts, now)).toBeNull();
  });

  it('읽을 수 없는 알림이 섞여 있어도 나머지는 정상 계산한다', () => {
    const now = new Date(2026, 1, 17, 6, 0);
    const alerts = [
      buildAlert({ id: 'a', schedule: '0 7-9 * * *' }),
      buildAlert({ id: 'b', schedule: '30 8 * * *' }),
    ];
    expect(computeNextAlert(alerts, now)?.time).toBe('08:30');
  });

  it('시각이 24를 넘으면 읽지 않는다', () => {
    const now = new Date(2026, 1, 17, 6, 0);
    expect(computeNextAlert([buildAlert({ schedule: '0 25 * * *' })], now)).toBeNull();
  });
});
