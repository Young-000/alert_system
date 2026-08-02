const DAY_NAMES_KR = ['일', '월', '화', '수', '목', '금', '토'] as const;

/**
 * Converts a 5-field cron expression to a human-readable Korean string.
 *
 * Supports patterns:
 * - `0 7 * * *`       -> "매일 07:00"
 * - `30 7 * * *`      -> "매일 07:30"
 * - `0 7 * * 1-5`     -> "평일 07:00"
 * - `0 7 * * 0,6`     -> "주말 07:00"
 * - `0 7 * * 1,3,5`   -> "월,수,금 07:00"
 * - `0 7,18 * * *`    -> "매일 07:00, 18:00"
 *
 * Falls back to the raw cron string on invalid input.
 */
export function cronToHuman(cron: string): string {
  if (!cron || typeof cron !== 'string') return cron;

  const parts = cron.trim().split(/\s+/);
  if (parts.length !== 5) return cron;

  const [minuteField, hourField, , , dowField] = parts;

  // Parse hours
  const hours = parseNumericList(hourField);
  const minutes = parseMinute(minuteField);

  if (hours === null || minutes === null) return cron;

  // Build time strings
  const timeStrings = hours.map(
    (h) => `${String(h).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`,
  );
  const timeStr = timeStrings.join(', ');

  // Parse day-of-week
  const dayLabel = parseDayOfWeek(dowField);

  return `${dayLabel} ${timeStr}`;
}

const DEFAULT_TIME_INPUT = '07:00';

/**
 * Extracts the earliest scheduled time from a cron expression as an
 * `<input type="time">` value (`HH:mm`).
 *
 * Falls back to `07:00` when the expression can't be parsed.
 */
export function cronToTimeInput(cron: string): string {
  const parsed = parseSchedule(cron);
  if (!parsed) return DEFAULT_TIME_INPUT;

  const [firstHour] = parsed.hours;
  return `${String(firstHour).padStart(2, '0')}:${String(parsed.minute).padStart(2, '0')}`;
}

/**
 * Replaces the earliest scheduled time of a cron expression with `HH:mm`,
 * keeping every other scheduled hour and the day-of-month/month/day-of-week fields.
 *
 * 알림 수정 모달은 시각 입력이 하나뿐이라 첫 시각만 보여준다. 그 값으로 크론 전체를
 * 다시 쓰면 `0 7,18 * * *`(출근+퇴근) 같은 알림에서 **퇴근 시각이 조용히 삭제된다.**
 * 그래서 나머지 시각은 반드시 보존한다. (cron의 분 필드는 모든 시각에 공통 적용된다)
 */
export function applyTimeToCron(cron: string, timeInput: string): string {
  const time = parseTimeInput(timeInput);
  if (!time) return cron;

  const parsed = parseSchedule(cron);
  if (!parsed) {
    return `${time.minute} ${time.hour} * * *`;
  }

  const [, ...remainingHours] = parsed.hours;
  const hours = [...new Set([time.hour, ...remainingHours])].sort((a, b) => a - b);

  return `${time.minute} ${hours.join(',')} ${parsed.restFields.join(' ')}`;
}

function parseTimeInput(timeInput: string): { hour: number; minute: number } | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(timeInput.trim());
  if (!match) return null;

  const hour = parseInt(match[1], 10);
  const minute = parseInt(match[2], 10);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;

  return { hour, minute };
}

function parseSchedule(
  cron: string,
): { minute: number; hours: number[]; restFields: string[] } | null {
  if (!cron || typeof cron !== 'string') return null;

  const parts = cron.trim().split(/\s+/);
  if (parts.length !== 5) return null;

  const minute = parseMinute(parts[0]);
  const hours = parseNumericList(parts[1]);
  if (minute === null || hours === null) return null;

  return {
    minute,
    hours: [...hours].sort((a, b) => a - b),
    restFields: parts.slice(2),
  };
}

function parseMinute(field: string): number | null {
  const num = parseInt(field, 10);
  if (isNaN(num) || num < 0 || num > 59) return null;
  return num;
}

function parseNumericList(field: string): number[] | null {
  if (field === '*') return null;

  const values: number[] = [];

  for (const part of field.split(',')) {
    const trimmed = part.trim();
    const num = parseInt(trimmed, 10);
    if (isNaN(num)) return null;
    values.push(num);
  }

  return values.length > 0 ? values : null;
}

function parseDayOfWeek(field: string): string {
  if (field === '*') return '매일';

  // Handle range syntax: "1-5", "0-6"
  const rangeMatch = field.match(/^(\d)-(\d)$/);
  if (rangeMatch) {
    const start = parseInt(rangeMatch[1], 10);
    const end = parseInt(rangeMatch[2], 10);

    if (start === 1 && end === 5) return '평일';
    if (start === 0 && end === 6) return '매일';

    const days: string[] = [];
    for (let i = start; i <= end; i++) {
      if (i >= 0 && i <= 6) {
        days.push(DAY_NAMES_KR[i]);
      }
    }
    return days.join(',');
  }

  // Handle comma-separated: "0,6" or "1,3,5"
  const dayNums = field.split(',').map((d) => parseInt(d.trim(), 10));
  if (dayNums.some(isNaN)) return field;

  // Check weekday / weekend shortcuts
  const sorted = [...dayNums].sort((a, b) => a - b);
  if (sorted.length === 2 && sorted[0] === 0 && sorted[1] === 6) return '주말';
  if (sorted.length === 5 && sorted.join(',') === '1,2,3,4,5') return '평일';
  if (sorted.length === 7) return '매일';

  const dayLabels = dayNums
    .filter((n) => n >= 0 && n <= 6)
    .map((n) => DAY_NAMES_KR[n]);

  return dayLabels.length > 0 ? dayLabels.join(',') : field;
}
