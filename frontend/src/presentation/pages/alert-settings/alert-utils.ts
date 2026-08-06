import type { TransportItem, Routine } from './types';
import { TRANSPORT_NOTIFY_OFFSET_MIN } from './types';

const MINUTES_PER_HOUR = 60;

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
