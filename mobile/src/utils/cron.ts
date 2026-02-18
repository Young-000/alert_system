import type { DayOfWeek } from '@/types/alert';

const DAY_LABELS_KR = ['일', '월', '화', '수', '목', '금', '토'] as const;

/**
 * Parse the day-of-week field from a cron expression.
 * Cron format: "minute hour * * days"
 * days can be: "*", "1-5", "0,6", "1,3,5", etc.
 */
export function parseCronDays(cron: string): DayOfWeek[] {
  const parts = cron.trim().split(/\s+/);
  const dayField = parts[4];

  if (!dayField || dayField === '*') {
    return [0, 1, 2, 3, 4, 5, 6];
  }

  const days = new Set<DayOfWeek>();

  const segments = dayField.split(',');
  for (const segment of segments) {
    if (segment.includes('-')) {
      const [startStr, endStr] = segment.split('-');
      const start = Number(startStr);
      const end = Number(endStr);
      if (!isNaN(start) && !isNaN(end)) {
        for (let i = start; i <= end; i++) {
          if (i >= 0 && i <= 6) {
            days.add(i as DayOfWeek);
          }
        }
      }
    } else {
      const day = Number(segment);
      if (!isNaN(day) && day >= 0 && day <= 6) {
        days.add(day as DayOfWeek);
      }
    }
  }

  return Array.from(days).sort((a, b) => a - b);
}

/**
 * Parse hour and minute from a cron expression.
 * Returns { hour, minute }.
 */
export function parseCronTime(cron: string): { hour: number; minute: number } {
  const parts = cron.trim().split(/\s+/);
  const minute = Number(parts[0]) || 0;
  const hour = Number(parts[1]) || 0;
  return { hour, minute };
}

/**
 * Build a cron expression from hour, minute, and days.
 * Output: "minute hour * * days"
 */
export function buildCronExpression(
  hour: number,
  minute: number,
  days: DayOfWeek[],
): string {
  const sorted = [...days].sort((a, b) => a - b);

  let dayField: string;
  if (sorted.length === 7) {
    dayField = '*';
  } else if (sorted.length === 0) {
    dayField = '*';
  } else {
    // Check if days are consecutive for range notation
    const isConsecutive = sorted.every(
      (d, i) => i === 0 || d === sorted[i - 1]! + 1,
    );
    if (isConsecutive && sorted.length > 2) {
      dayField = `${sorted[0]}-${sorted[sorted.length - 1]}`;
    } else {
      dayField = sorted.join(',');
    }
  }

  return `${minute} ${hour} * * ${dayField}`;
}

/**
 * Format the time portion of a cron expression to "HH:MM".
 */
export function formatAlertTime(cron: string): string {
  const { hour, minute } = parseCronTime(cron);
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

/**
 * Format days of week to a short Korean string.
 * Examples: "매일", "평일", "주말", "월수금"
 */
export function formatDaysShort(days: DayOfWeek[]): string {
  const sorted = [...days].sort((a, b) => a - b);

  if (sorted.length === 7) return '매일';

  const isWeekday =
    sorted.length === 5 &&
    sorted[0] === 1 &&
    sorted[1] === 2 &&
    sorted[2] === 3 &&
    sorted[3] === 4 &&
    sorted[4] === 5;
  if (isWeekday) return '평일';

  const isWeekend =
    sorted.length === 2 && sorted[0] === 0 && sorted[1] === 6;
  if (isWeekend) return '주말';

  return sorted.map((d) => DAY_LABELS_KR[d]).join('');
}

/**
 * Format alert types to a readable Korean string.
 * Example: ["weather", "airQuality"] -> "날씨, 미세먼지"
 */
const ALERT_TYPE_LABELS: Record<string, string> = {
  weather: '날씨',
  airQuality: '미세먼지',
  subway: '지하철',
  bus: '버스',
};

export function formatAlertTypes(types: string[]): string {
  return types.map((t) => ALERT_TYPE_LABELS[t] ?? t).join(', ');
}
