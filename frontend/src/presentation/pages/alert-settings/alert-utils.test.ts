import { describe, it, expect } from 'vitest';
import {
  generateSchedule,
  generateAlertName,
  getNotificationTimes,
  getEffectiveTransports,
  findDuplicateAlert,
  QUICK_WEATHER_PRESET,
} from './alert-utils';
import type { Routine, TransportItem } from './types';
import type { Alert } from '@infrastructure/api';

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

/**
 * 교통을 껐는데 고른 정류장이 남아 있으면, 화면과 저장이 갈린다.
 *
 * 위저드는 `selectedTransports`를 지우지 않은 채 '교통' 체크만 끌 수 있다
 * (`use-wizard-navigation.ts`의 goBack으로 'type' 단계까지 되돌아갈 수 있다).
 * 그때 미리보기(`getNotificationTimes`)는 `wantsTransport`를 보고 교통 알림을
 * 빼지만, 저장 payload와 확인 화면은 `selectedTransports`를 그대로 읽는다.
 */
describe('getEffectiveTransports', () => {
  it('교통을 껐으면 고른 정류장이 남아 있어도 비운다', () => {
    expect(getEffectiveTransports(false, [SUBWAY])).toEqual([]);
  });

  it('교통을 켰으면 고른 정류장을 그대로 돌려준다', () => {
    expect(getEffectiveTransports(true, [SUBWAY])).toEqual([SUBWAY]);
  });

  it('미리보기가 교통 알림을 빼면 알림 이름에도 정류장이 남지 않는다', () => {
    const transports = getEffectiveTransports(false, [SUBWAY]);

    expect(getNotificationTimes(true, false, routine(), transports)).toHaveLength(1);
    expect(generateAlertName(true, transports)).toBe('날씨 알림');
  });
});

describe('findDuplicateAlert — 같은 시각·같은 유형', () => {
  // 서버에는 알림 중복 규칙이 없다(알림 경로에 ConflictException 0건).
  // 이 함수가 유일한 방어선이라, 화면마다 다시 구현하면 화면마다 답이 갈린다.
  const at = (id: string, name: string, schedule: string, alertTypes: string[]): Alert =>
    ({ id, userId: 'u1', name, schedule, alertTypes, enabled: true }) as unknown as Alert;

  const eightWeather = at('a1', '출근 날씨', '0 8 * * *', ['weather', 'airQuality']);

  it('시각과 유형이 같으면 이름이 달라도 중복이다', () => {
    // 이름으로만 비교하면 사용자가 지은 이름 하나로 규칙이 뚫린다.
    expect(
      findDuplicateAlert([eightWeather], '0 8 * * *', ['weather', 'airQuality']),
    ).toBe(eightWeather);
  });

  it('유형 순서가 달라도 같은 집합이면 중복이다', () => {
    expect(
      findDuplicateAlert([eightWeather], '0 8 * * *', ['airQuality', 'weather']),
    ).toBe(eightWeather);
  });

  it('시각이 다르면 중복이 아니다', () => {
    expect(
      findDuplicateAlert([eightWeather], '0 7 * * *', ['weather', 'airQuality']),
    ).toBeNull();
  });

  it('유형이 다르면 중복이 아니다', () => {
    expect(findDuplicateAlert([eightWeather], '0 8 * * *', ['weather'])).toBeNull();
  });

  it('excludeId로 지정한 알림은 후보에서 뺀다', () => {
    // 수정 경로가 쓴다 — 자기 자신이 남아 있으면 시각을 그대로 둔 개명이 막힌다.
    expect(
      findDuplicateAlert([eightWeather], '0 8 * * *', ['weather', 'airQuality'], 'a1'),
    ).toBeNull();
  });

  it('빠른 프리셋이 만드는 알림도 같은 규칙으로 걸린다', () => {
    // 프리셋 버튼은 "매일 오전 8시 날씨+미세먼지"를 만든다. 위저드로 같은 알림을
    // 이미 만들어 둔 사용자에게 버튼이 열려 있으면, 08시에 알림톡이 두 통 나간다.
    expect(
      findDuplicateAlert(
        [eightWeather],
        QUICK_WEATHER_PRESET.schedule,
        QUICK_WEATHER_PRESET.alertTypes,
      ),
    ).toBe(eightWeather);
  });
});
