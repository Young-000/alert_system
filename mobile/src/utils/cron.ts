import type { DayOfWeek } from '@/types/alert';

const DAY_LABELS_KR = ['일', '월', '화', '수', '목', '금', '토'] as const;

/**
 * `"7"` · `"7,18"`처럼 **순수한 숫자 목록일 때만** 시각을 돌려준다.
 *
 * `Number('7,18')`도 `Number('7-9')`도 NaN인데, 호출부가 이걸 `|| 0`이나 `?? 0`으로
 * 흘려보내면 **07:00 알림이 00:00으로 표시되고, 저장하면 실제로 00:00이 된다.**
 * 읽을 수 없으면 0으로 때우지 말고 실패로 알린다.
 */
function parseHourList(field: string | undefined): number[] | null {
  if (!field || field === '*') return null;

  const values: number[] = [];
  for (const part of field.split(',')) {
    const trimmed = part.trim();
    if (!/^\d+$/.test(trimmed)) return null;
    const value = Number(trimmed);
    if (value < 0 || value > 23) return null;
    values.push(value);
  }

  return values.length > 0 ? [...values].sort((a, b) => a - b) : null;
}

function parseMinuteField(field: string | undefined): number | null {
  if (!field || !/^\d+$/.test(field.trim())) return null;
  const value = Number(field.trim());
  return value >= 0 && value <= 59 ? value : null;
}

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
 * 크론에 담긴 **모든 시각**을 오름차순으로 돌려준다. 숫자 목록으로 읽히지 않으면 null.
 */
export function parseCronHours(cron: string): number[] | null {
  return parseHourList(cron.trim().split(/\s+/)[1]);
}

/**
 * Parse hour and minute from a cron expression.
 * 시각이 여러 개면 **가장 이른 시각**을 돌려준다 (수정 폼의 시각 입력이 하나뿐이라서).
 */
export function parseCronTime(cron: string): { hour: number; minute: number } {
  const parts = cron.trim().split(/\s+/);
  const hours = parseCronHours(cron);
  return {
    hour: hours ? hours[0]! : 0,
    minute: parseMinuteField(parts[0]) ?? 0,
  };
}

function buildDayField(days: DayOfWeek[]): string {
  const sorted = [...days].sort((a, b) => a - b);

  if (sorted.length === 7 || sorted.length === 0) return '*';

  // Check if days are consecutive for range notation
  const isConsecutive = sorted.every((d, i) => i === 0 || d === sorted[i - 1]! + 1);
  if (isConsecutive && sorted.length > 2) {
    return `${sorted[0]}-${sorted[sorted.length - 1]}`;
  }
  return sorted.join(',');
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
  return `${minute} ${hour} * * ${buildDayField(days)}`;
}

/**
 * 기존 알림을 수정할 때 쓰는 크론 재작성.
 *
 * 수정 폼의 시각 입력은 하나뿐이라 가장 이른 시각만 보여준다. 그 값으로 크론을
 * 통째로 다시 쓰면 `0 7,18 * * 1-5`(출근+퇴근) 같은 알림에서 **퇴근 시각이 조용히
 * 삭제된다.** 그래서 나머지 시각은 반드시 보존한다.
 * (크론의 분 필드는 모든 시각에 공통 적용된다.)
 */
export function applyAlertTime(
  originalCron: string,
  form: { hour: number; minute: number; days: DayOfWeek[] },
): string {
  const originalHours = parseCronHours(originalCron);
  const remainingHours = originalHours ? originalHours.slice(1) : [];
  const hours = [...new Set([form.hour, ...remainingHours])].sort((a, b) => a - b);

  return `${form.minute} ${hours.join(',')} * * ${buildDayField(form.days)}`;
}

/**
 * Format the time portion of a cron expression to "HH:MM".
 * 시각이 여러 개면 "07:00, 18:00"처럼 전부 보여준다.
 * 숫자로 읽을 수 없으면 지어내지 않고 원본 크론을 그대로 보여준다.
 */
export function formatAlertTime(cron: string): string {
  const parts = cron.trim().split(/\s+/);
  const minute = parseMinuteField(parts[0]);
  const hours = parseHourList(parts[1]);

  if (minute === null || hours === null) return cron.trim();

  return hours
    .map((h) => `${String(h).padStart(2, '0')}:${String(minute).padStart(2, '0')}`)
    .join(', ');
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
