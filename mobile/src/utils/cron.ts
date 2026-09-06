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
 * 분 필드가 **처음 발화하는 분**. 표시 전용이다.
 *
 * `parseCronTime`의 `?? 0` 폴백은 수정 폼용이다 — 폼은 시각 입력이 하나뿐이라
 * 읽을 수 없으면 0을 채워 넣는다. 그 폴백을 "다음 알림" 표시에 쓰면
 * `10-30 7 * * *`(실제로는 07:10부터 발화)이 **"07:00"으로 예고된다.**
 * 웹도 같은 결함이 있었고 같은 계약으로 맞췄다
 * (`frontend/.../cron-utils.ts` `earliestCronMinute`).
 *
 * `*`·`*​/5`는 0분부터, `10-30`은 10분부터, `45,15`는 15분부터 울린다.
 */
export function earliestCronMinute(field: string | undefined): number | null {
  const trimmed = field?.trim();
  if (!trimmed) return null;

  const candidates: number[] = [];
  for (const part of trimmed.split(',')) {
    const [value, step] = part.trim().split('/');
    if (step !== undefined && !/^\d+$/.test(step)) return null;

    if (value === '*') {
      candidates.push(0);
      continue;
    }

    const range = /^(\d+)-(\d+)$/.exec(value!);
    if (range) {
      const start = Number(range[1]);
      const end = Number(range[2]);
      if (start > end || end > 59) return null;
      candidates.push(start);
      continue;
    }

    if (!/^\d+$/.test(value!)) return null;
    const num = Number(value);
    if (num < 0 || num > 59) return null;
    candidates.push(num);
  }

  return candidates.length > 0 ? Math.min(...candidates) : null;
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
