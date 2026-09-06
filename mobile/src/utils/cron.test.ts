import { describe, expect, it } from 'vitest';

import {
  applyAlertTime,
  buildCronExpression,
  earliestCronMinute,
  formatAlertTime,
  formatAlertTypes,
  formatDaysShort,
  parseCronDays,
  parseCronHours,
  parseCronTime,
} from './cron';

describe('parseCronHours', () => {
  it('단일 시각과 목록을 오름차순으로 읽는다', () => {
    expect(parseCronHours('0 7 * * *')).toEqual([7]);
    expect(parseCronHours('0 18,7 * * *')).toEqual([7, 18]);
  });

  it('숫자 목록이 아니면 null (0으로 때우지 않는다)', () => {
    expect(parseCronHours('0 * * * *')).toBeNull();
    expect(parseCronHours('0 7-9 * * *')).toBeNull();
    expect(parseCronHours('0 */2 * * *')).toBeNull();
    expect(parseCronHours('0 24 * * *')).toBeNull();
  });
});

describe('parseCronTime', () => {
  it('시각이 여러 개면 가장 이른 것을 준다', () => {
    expect(parseCronTime('30 18,7 * * *')).toEqual({ hour: 7, minute: 30 });
  });

  it('읽을 수 없으면 0으로 떨어진다', () => {
    expect(parseCronTime('* * * * *')).toEqual({ hour: 0, minute: 0 });
  });
});

describe('parseCronDays', () => {
  it('*는 매일', () => {
    expect(parseCronDays('0 7 * * *')).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  it('범위와 목록을 읽는다', () => {
    expect(parseCronDays('0 7 * * 1-5')).toEqual([1, 2, 3, 4, 5]);
    expect(parseCronDays('0 7 * * 0,6')).toEqual([0, 6]);
  });

  it('범위 밖 값은 버린다', () => {
    expect(parseCronDays('0 7 * * 7')).toEqual([]);
  });
});

describe('buildCronExpression', () => {
  it('연속 3일 이상은 범위 표기', () => {
    expect(buildCronExpression(7, 0, [1, 2, 3, 4, 5])).toBe('0 7 * * 1-5');
  });

  it('띄엄띄엄한 요일은 목록 표기', () => {
    expect(buildCronExpression(7, 30, [1, 3, 5])).toBe('30 7 * * 1,3,5');
  });

  it('7일 전부는 *', () => {
    expect(buildCronExpression(7, 0, [0, 1, 2, 3, 4, 5, 6])).toBe('0 7 * * *');
  });

  it('요일이 비면 *(= 매일)가 된다 — 그래서 폼이 빈 선택을 막는다', () => {
    // 크론에는 "아무 날도 아님"을 적을 수 없다. AlertFormModal이 저장 전에
    // 최소 1개 요일을 강제하는 이유다.
    expect(buildCronExpression(7, 0, [])).toBe('0 7 * * *');
  });
});

describe('applyAlertTime', () => {
  it('가장 이른 시각만 바꾸고 나머지 시각은 보존한다', () => {
    // 출근(7시)+퇴근(18시) 알림의 출근 시각만 9시로 옮긴다.
    expect(
      applyAlertTime('0 7,18 * * 1-5', { hour: 9, minute: 0, days: [1, 2, 3, 4, 5] }),
    ).toBe('0 9,18 * * 1-5');
  });

  it('원본 시각을 읽을 수 없으면 폼 값만 쓴다', () => {
    expect(applyAlertTime('0 */2 * * *', { hour: 9, minute: 0, days: [1, 2, 3, 4, 5] })).toBe(
      '0 9 * * 1-5',
    );
  });

  it('요일 변경이 반영된다', () => {
    expect(applyAlertTime('0 7 * * 1-5', { hour: 7, minute: 0, days: [0, 6] })).toBe(
      '0 7 * * 0,6',
    );
  });
});

describe('formatAlertTime', () => {
  it('시각을 HH:MM으로, 여러 개면 전부 보여준다', () => {
    expect(formatAlertTime('0 7 * * *')).toBe('07:00');
    expect(formatAlertTime('5 7,18 * * 1-5')).toBe('07:05, 18:05');
  });

  it('읽을 수 없으면 지어내지 않고 원본을 보여준다', () => {
    expect(formatAlertTime('0 */2 * * *')).toBe('0 */2 * * *');
  });
});

describe('formatDaysShort', () => {
  it('매일·평일·주말을 이름으로 부른다', () => {
    expect(formatDaysShort([0, 1, 2, 3, 4, 5, 6])).toBe('매일');
    expect(formatDaysShort([1, 2, 3, 4, 5])).toBe('평일');
    expect(formatDaysShort([0, 6])).toBe('주말');
  });

  it('그 밖에는 요일 글자를 잇는다', () => {
    expect(formatDaysShort([1, 3, 5])).toBe('월수금');
  });
});

describe('formatAlertTypes', () => {
  it('알려진 유형은 한국어로 바꾸고 모르는 값은 그대로 둔다', () => {
    expect(formatAlertTypes(['weather', 'airQuality'])).toBe('날씨, 미세먼지');
    expect(formatAlertTypes(['unknown'])).toBe('unknown');
  });
});

// ── 표시용 분 파서 (2026-09-07 auto-review) ──────────────────────
//
// `parseCronTime`의 `?? 0` 폴백은 수정 폼용이다. "다음 알림"을 표시할 때
// 그 폴백을 쓰면 `10-30 7 * * *`(07:10부터 발화)이 "07:00"으로 예고된다.
describe('earliestCronMinute', () => {
  it('숫자는 그대로', () => {
    expect(earliestCronMinute('30')).toBe(30);
  });

  it('*는 0분부터', () => {
    expect(earliestCronMinute('*')).toBe(0);
  });

  it('스텝은 0분부터', () => {
    expect(earliestCronMinute('*/5')).toBe(0);
  });

  it('범위는 시작 분부터', () => {
    expect(earliestCronMinute('10-30')).toBe(10);
  });

  it('목록은 가장 이른 분', () => {
    expect(earliestCronMinute('45,15')).toBe(15);
  });

  it('60분 이상은 읽지 않는다', () => {
    expect(earliestCronMinute('75')).toBeNull();
  });

  it('숫자가 아니면 읽지 않는다', () => {
    expect(earliestCronMinute('abc')).toBeNull();
  });
});
