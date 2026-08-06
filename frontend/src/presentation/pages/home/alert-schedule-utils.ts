import type { Alert } from '@infrastructure/api';

const DAYS_PER_WEEK = 7;
const DAY_NAMES_KR = ['일', '월', '화', '수', '목', '금', '토'] as const;
const ALL_DAYS_OF_WEEK: ReadonlySet<number> = new Set([0, 1, 2, 3, 4, 5, 6]);

/**
 * 표준 5필드 cron("분 시 일 월 요일")의 요일 집합. 0=일요일 ~ 6=토요일.
 * `*`, 범위("1-5"), 콤마 목록("0,6")을 지원한다 — `cron-utils.ts`가 화면에
 * 렌더링하고 백엔드가 EventBridge로 그대로 넘기는 형식과 같다.
 *
 * 해석할 수 없으면 매일로 간주한다 (알림을 통째로 누락시키지 않기 위해).
 */
function parseCronDaysOfWeek(schedule: string): ReadonlySet<number> {
  const fields = schedule.trim().split(/\s+/);
  if (fields.length !== 5) return ALL_DAYS_OF_WEEK;

  const dowField = fields[4];
  if (dowField === '*') return ALL_DAYS_OF_WEEK;

  const days = new Set<number>();
  for (const part of dowField.split(',')) {
    const range = part.trim().match(/^(\d)-(\d)$/);
    if (range) {
      const start = Number(range[1]);
      const end = Number(range[2]);
      if (start > end || end > 6) return ALL_DAYS_OF_WEEK;
      for (let day = start; day <= end; day++) days.add(day);
      continue;
    }

    const day = Number(part.trim());
    if (!Number.isInteger(day) || day < 0 || day > 6) return ALL_DAYS_OF_WEEK;
    days.add(day);
  }

  return days.size > 0 ? days : ALL_DAYS_OF_WEEK;
}

/** 오늘(0)부터 세어 알림이 실제로 발화하는 가장 가까운 날까지의 일수. */
function findNextActiveDayOffset(
  activeDays: ReadonlySet<number>,
  currentDayOfWeek: number,
  isStillUpcomingToday: boolean,
): number | null {
  for (let offset = 0; offset < DAYS_PER_WEEK; offset++) {
    if (offset === 0 && !isStillUpcomingToday) continue;
    if (activeDays.has((currentDayOfWeek + offset) % DAYS_PER_WEEK)) return offset;
  }
  return null;
}

function formatAlertTime(
  hour: number,
  minute: number,
  dayOffset: number,
  currentDayOfWeek: number,
): string {
  const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  if (dayOffset === 0) return timeStr;
  if (dayOffset === 1) return `내일 ${timeStr}`;
  return `${DAY_NAMES_KR[(currentDayOfWeek + dayOffset) % DAYS_PER_WEEK]} ${timeStr}`;
}

/**
 * 다음에 울릴 알림 1건. cron의 요일 필드를 반영하므로 평일 전용 알림이
 * 토요일에 "내일"로 표시되는 일은 없다.
 */
export function computeNextAlert(
  alerts: Alert[],
  now?: Date,
): { time: string; label: string } | null {
  const enabled = alerts.filter(a => a.enabled);
  if (enabled.length === 0) return null;

  const currentTime = now ?? new Date();
  const curH = currentTime.getHours();
  const curM = currentTime.getMinutes();
  const curDayOfWeek = currentTime.getDay();

  let best: { h: number; m: number; label: string; dayOffset: number } | null = null;

  for (const alert of enabled) {
    const parts = alert.schedule.split(' ');
    if (parts.length < 2) continue;
    const cronMin = isNaN(Number(parts[0])) ? 0 : Number(parts[0]);
    const hours = parts[1].includes(',')
      ? parts[1].split(',').map(Number).filter(h => !isNaN(h))
      : [Number(parts[1])].filter(h => !isNaN(h));

    const label = alert.alertTypes.includes('weather') ? '날씨' : '교통';
    const activeDays = parseCronDaysOfWeek(alert.schedule);

    for (const h of hours) {
      const isStillUpcomingToday = h > curH || (h === curH && cronMin > curM);
      const dayOffset = findNextActiveDayOffset(
        activeDays,
        curDayOfWeek,
        isStillUpcomingToday,
      );
      if (dayOffset === null) continue;

      const minutesUntil = dayOffset * 24 * 60 + h * 60 + cronMin - (curH * 60 + curM);
      const bestMinutesUntil = best
        ? best.dayOffset * 24 * 60 + best.h * 60 + best.m - (curH * 60 + curM)
        : Infinity;

      if (minutesUntil < bestMinutesUntil) {
        best = { h, m: cronMin, label, dayOffset };
      }
    }
  }

  if (!best) return null;
  return {
    time: formatAlertTime(best.h, best.m, best.dayOffset, curDayOfWeek),
    label: best.label,
  };
}
