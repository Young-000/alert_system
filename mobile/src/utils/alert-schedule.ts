import { earliestCronMinute, parseCronDays, parseCronHours } from './cron';

import type { Alert } from '@/types/home';

const DAYS_PER_WEEK = 7;
const DAY_LABELS_KR = ['일', '월', '화', '수', '목', '금', '토'] as const;
const ALL_DAYS_OF_WEEK: ReadonlySet<number> = new Set([0, 1, 2, 3, 4, 5, 6]);

/**
 * 크론의 요일 집합. 0=일요일 ~ 6=토요일.
 *
 * `parseCronDays`는 읽을 수 없는 요일 필드에 대해 **빈 배열**을 돌려준다.
 * 그대로 쓰면 발화하는 날이 하루도 없다고 판단해 알림이 화면에서 통째로 사라진다.
 * 웹(`alert-schedule-utils.ts`)과 같이 "해석 불가 = 매일"로 폴백한다.
 */
function activeDaysOf(schedule: string): ReadonlySet<number> {
  const days = parseCronDays(schedule);
  return days.length > 0 ? new Set<number>(days) : ALL_DAYS_OF_WEEK;
}

/**
 * 오늘(0)부터 세어 알림이 실제로 발화하는 가장 가까운 날까지의 일수.
 *
 * offset 6까지만 훑으면 **주 1회 알림이 그날 시각을 넘긴 순간 사라진다.**
 * `0 8 * * 1`(월요일만)을 월요일 09:00에 보면 오늘은 이미 지났고 화~일요일은
 * 활성일이 아니라 후보가 없다 — 실제로는 7일 뒤에 울리는데 화면에는
 * "다음 알림 없음"이 뜬다. 다음 주 같은 요일(offset 7)까지 본다.
 */
function findNextActiveDayOffset(
  activeDays: ReadonlySet<number>,
  currentDayOfWeek: number,
  isStillUpcomingToday: boolean,
): number | null {
  for (let offset = 0; offset <= DAYS_PER_WEEK; offset++) {
    if (offset === 0 && !isStillUpcomingToday) continue;
    if (activeDays.has((currentDayOfWeek + offset) % DAYS_PER_WEEK)) return offset;
  }
  return null;
}

function formatNextAlertTime(
  hour: number,
  minute: number,
  dayOffset: number,
  currentDayOfWeek: number,
): string {
  const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  if (dayOffset === 0) return timeStr;
  if (dayOffset === 1) return `내일 ${timeStr}`;

  const dayLabel = DAY_LABELS_KR[(currentDayOfWeek + dayOffset) % DAYS_PER_WEEK];
  // offset 7 = 오늘과 같은 요일. "월 08:00"이라고만 하면 월요일에 보는 사용자가
  // 오늘로 오해한다.
  if (dayOffset === DAYS_PER_WEEK) return `다음 주 ${dayLabel} ${timeStr}`;
  return `${dayLabel} ${timeStr}`;
}

/**
 * 다음에 울릴 알림 1건.
 *
 * 크론의 **요일 필드를 반영한다.** 반영하지 않으면 `0 7 * * 1-5`(평일 전용) 알림이
 * 토요일에 "내일 07:00"으로 표시된다 — 일요일에는 울리지 않으므로 거짓 예고다.
 * 실제 발송은 서버 크론이 하므로 오발송은 없지만, 주말 내내 틀린 시각을 보여준다.
 */
export function computeNextAlert(
  alerts: Alert[],
  now?: Date,
): { time: string; label: string } | null {
  const enabled = alerts.filter((a) => a.enabled);
  if (enabled.length === 0) return null;

  const currentTime = now ?? new Date();
  const curH = currentTime.getHours();
  const curM = currentTime.getMinutes();
  const curDayOfWeek = currentTime.getDay();
  const nowMinutes = curH * 60 + curM;

  let best: { h: number; m: number; label: string; dayOffset: number } | null = null;
  let bestMinutesUntil = Infinity;

  for (const alert of enabled) {
    const hours = parseCronHours(alert.schedule);
    if (!hours) continue;

    // `parseCronTime`은 수정 폼용이라 못 읽은 분을 0으로 채운다. 표시에 그 값을
    // 쓰면 `10-30 7 * * *`(07:10부터 발화)을 "07:00"이라고 예고한다.
    const cronMin = earliestCronMinute(alert.schedule.trim().split(/\s+/)[0]);
    if (cronMin === null) continue;

    const label = alert.alertTypes.includes('weather') ? '날씨 + 교통 알림' : '교통 알림';
    const activeDays = activeDaysOf(alert.schedule);

    for (const h of hours) {
      const isStillUpcomingToday = h > curH || (h === curH && cronMin > curM);
      const dayOffset = findNextActiveDayOffset(
        activeDays,
        curDayOfWeek,
        isStillUpcomingToday,
      );
      if (dayOffset === null) continue;

      const minutesUntil = dayOffset * 24 * 60 + h * 60 + cronMin - nowMinutes;

      if (minutesUntil < bestMinutesUntil) {
        bestMinutesUntil = minutesUntil;
        best = { h, m: cronMin, label, dayOffset };
      }
    }
  }

  if (!best) return null;

  return {
    time: formatNextAlertTime(best.h, best.m, best.dayOffset, curDayOfWeek),
    label: best.label,
  };
}
