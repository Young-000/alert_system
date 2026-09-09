import type { Alert, AlertType } from '@infrastructure/api';
import type { TransportItem, Routine } from './types';
import { TRANSPORT_NOTIFY_OFFSET_MIN } from './types';
import { normalizeCronForComparison } from './cron-utils';

const MINUTES_PER_HOUR = 60;

/**
 * "빠른 알림 설정" 프리셋이 만드는 알림. 버튼의 잠금 조건과 생성 요청이
 * **같은 값**을 봐야 한다 — 갈라지면 버튼은 열려 있는데 누르면 거절되거나,
 * 그 반대가 된다.
 */
export const QUICK_WEATHER_PRESET = {
  name: '아침 날씨 알림',
  schedule: '0 8 * * *',
  alertTypes: ['weather', 'airQuality'] as AlertType[],
} as const;

/**
 * 같은 시각에 같은 유형으로 울리는 알림. 있으면 그 알림을, 없으면 null.
 *
 * 서버에는 이 규칙이 없다(알림 경로에 `ConflictException` 0건) — 여기가 유일한
 * 방어선이다. 그래서 규칙을 **한 곳에만** 둔다. 예전에는 위저드가 이 규칙으로
 * 막는 동안 빠른 프리셋은 알림 **이름**만 비교했다. 사용자가 위저드로 만든
 * 08시 날씨 알림에 다른 이름을 붙였으면 프리셋 버튼이 열려 있었고, 누르면
 * 같은 분에 같은 알림톡이 두 통 나가는 상태가 만들어졌다.
 *
 * @param excludeId 수정 경로가 편집 대상 자신을 후보에서 뺄 때 쓴다.
 */
export function findDuplicateAlert(
  alerts: readonly Alert[],
  schedule: string,
  alertTypes: readonly AlertType[],
  excludeId?: string,
): Alert | null {
  const normalizedNew = normalizeCronForComparison(schedule);
  const newTypes = [...alertTypes].sort();

  return (
    alerts.find((existing) => {
      if (existing.id === excludeId) return false;
      if (normalizeCronForComparison(existing.schedule) !== normalizedNew) return false;

      const existingTypes = [...existing.alertTypes].sort();
      return (
        existingTypes.length === newTypes.length &&
        existingTypes.every((type, i) => type === newTypes[i])
      );
    }) ?? null
  );
}

interface TimeOfDay {
  hour: number;
  minute: number;
}

/**
 * `<input type="time">` 값(`HH:mm`)만 시각으로 인정한다.
 *
 * 사용자가 시각 입력을 비우면 값은 빈 문자열이 된다. `split(':').map(Number)`로
 * 훑으면 분이 `NaN`이 되어 미리보기에 `00:NaN`이 그대로 렌더된다.
 */
function parseTimeOfDay(value: string): TimeOfDay | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;

  return { hour, minute };
}

/** 출발 시각에서 `offsetMin`만큼 앞당긴다. 자정을 넘겨 당겨지면 00:00으로 고정. */
function shiftEarlier(value: string, offsetMin: number): TimeOfDay | null {
  const time = parseTimeOfDay(value);
  if (!time) return null;

  const total = time.hour * MINUTES_PER_HOUR + time.minute - offsetMin;
  if (total < 0) return { hour: 0, minute: 0 };

  return { hour: Math.floor(total / MINUTES_PER_HOUR), minute: total % MINUTES_PER_HOUR };
}

/** 루틴에서 알림이 울려야 할 시각들을 뽑는다 (날씨 → 출근 → 퇴근 순). */
function planAlertTimes(
  wantsWeather: boolean,
  wantsTransport: boolean,
  routine: Routine,
): TimeOfDay[] {
  const times: TimeOfDay[] = [];

  if (wantsWeather) {
    const wakeUp = parseTimeOfDay(routine.wakeUp);
    if (wakeUp) times.push(wakeUp);
  }

  if (wantsTransport) {
    const toWork = shiftEarlier(routine.leaveHome, TRANSPORT_NOTIFY_OFFSET_MIN);
    if (toWork) times.push(toWork);

    const toHome = shiftEarlier(routine.leaveWork, TRANSPORT_NOTIFY_OFFSET_MIN);
    if (toHome) times.push(toHome);
  }

  return times;
}

/**
 * 계획한 시각들을 크론 한 줄이 표현할 수 있는 형태로 확정한다.
 *
 * 크론의 분 필드는 **모든 시각에 공통 적용**되므로(`cron-utils.ts` 참고) 분은 하나만
 * 고를 수 있다. 가장 이른 알림의 분을 쓴다 — 알림 수정 모달(`applyTimeToCron`)이
 * 첫 시각의 분을 전체에 적용하는 규칙과 같다.
 */
function resolveSchedule(
  wantsWeather: boolean,
  wantsTransport: boolean,
  routine: Routine,
): { minute: number; hours: number[] } {
  const planned = planAlertTimes(wantsWeather, wantsTransport, routine);
  if (planned.length === 0) return { minute: 0, hours: [] };

  const earliest = planned.reduce((a, b) =>
    a.hour * MINUTES_PER_HOUR + a.minute <= b.hour * MINUTES_PER_HOUR + b.minute ? a : b,
  );
  const hours = [...new Set(planned.map((t) => t.hour))].sort((a, b) => a - b);

  return { minute: earliest.minute, hours };
}

function formatTime(hour: number, minute: number): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export function generateSchedule(
  wantsWeather: boolean,
  wantsTransport: boolean,
  routine: Routine,
): string {
  const { minute, hours } = resolveSchedule(wantsWeather, wantsTransport, routine);
  return `${minute} ${hours.join(',')} * * *`;
}

/**
 * 저장·표시에 실제로 반영할 교통수단.
 *
 * 위저드는 정류장을 고른 뒤에도 '교통' 체크를 끌 수 있고(`use-wizard-navigation.ts`의
 * goBack으로 'type' 단계까지 되돌아간다), 이때 고른 정류장은 지워지지 않는다.
 * 그 값을 그대로 저장하면 사용자가 끈 교통 알림이 만들어진다 — 게다가 스케줄은
 * `wantsTransport === false`로 계산돼 출근 시각이 빠지므로, 지하철 알림이 기상
 * 시각에 울린다. 표시·미리보기·저장이 모두 이 함수를 거쳐 한 값을 본다.
 */
export function getEffectiveTransports(
  wantsTransport: boolean,
  selectedTransports: readonly TransportItem[],
): readonly TransportItem[] {
  return wantsTransport ? selectedTransports : [];
}

export function generateAlertName(
  wantsWeather: boolean,
  selectedTransports: readonly TransportItem[],
): string {
  const parts: string[] = [];
  if (selectedTransports.length > 0) {
    parts.push(selectedTransports[0].name);
    if (selectedTransports.length > 1) {
      parts[0] += ` 외 ${selectedTransports.length - 1}곳`;
    }
  }
  if (wantsWeather && selectedTransports.length === 0) {
    parts.push('날씨');
  }
  return parts.length > 0 ? `${parts.join(' ')} 알림` : '출퇴근 알림';
}

/**
 * 확인 화면의 "알림 미리보기"에 띄울 시각.
 *
 * **반드시 `generateSchedule`이 저장할 크론이 실제로 발화하는 시각이어야 한다.**
 * 분을 각자 계산하면 화면은 07:45를 약속하고 알림은 07:00에 오는 일이 생긴다.
 */
export function getNotificationTimes(
  wantsWeather: boolean,
  wantsTransport: boolean,
  routine: Routine,
  selectedTransports: readonly TransportItem[],
): { time: string; content: string }[] {
  // 분은 저장될 스케줄에서 가져온다 — 미리보기가 독자적으로 계산하면 안 된다.
  const { minute } = resolveSchedule(wantsWeather, wantsTransport, routine);
  const times: { time: string; content: string }[] = [];

  if (wantsWeather) {
    const wakeUp = parseTimeOfDay(routine.wakeUp);
    if (wakeUp) {
      times.push({
        time: formatTime(wakeUp.hour, minute),
        content: '오늘 날씨 + 미세먼지',
      });
    }
  }

  if (wantsTransport && selectedTransports.length > 0) {
    const toWork = shiftEarlier(routine.leaveHome, TRANSPORT_NOTIFY_OFFSET_MIN);
    if (toWork) {
      times.push({
        time: formatTime(toWork.hour, minute),
        content: `출근길 교통 (${selectedTransports.map((t) => t.name).join(', ')})`,
      });
    }

    const toHome = shiftEarlier(routine.leaveWork, TRANSPORT_NOTIFY_OFFSET_MIN);
    if (toHome) {
      times.push({ time: formatTime(toHome.hour, minute), content: '퇴근길 교통' });
    }
  }

  return times.sort((a, b) => a.time.localeCompare(b.time));
}
