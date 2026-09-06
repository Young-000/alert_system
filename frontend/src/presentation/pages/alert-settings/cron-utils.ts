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
  const parsed = parseCronSchedule(cron);
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

  const parsed = parseCronSchedule(cron);
  if (!parsed) {
    // 시각 필드를 숫자로 못 읽어도(`7-9`·`*/2`) 요일·일·월 제한은 살려둔다 —
    // 시각 하나를 고치려다 "평일만"까지 잃게 하지 않는다.
    const fields = cron.trim().split(/\s+/);
    const restFields = fields.length === 5 ? fields.slice(2) : ['*', '*', '*'];
    return `${time.minute} ${time.hour} ${restFields.join(' ')}`;
  }

  const [, ...remainingHours] = parsed.hours;
  const hours = [...new Set([time.hour, ...remainingHours])].sort((a, b) => a - b);

  return `${time.minute} ${hours.join(',')} ${parsed.restFields.join(' ')}`;
}

/**
 * 두 알림이 "같은 스케줄"인지 비교하기 위한 정규형.
 *
 * 시각 순서(`0 18,7` vs `0 7,18`)와 공백 차이만 흡수하고, 그 밖에는 아무것도
 * 합치지 않는다. 시각 필드를 `parseInt`로 훑으면 `'7-9'`가 `7`로, `'*'`가
 * NaN(→탈락)으로 읽혀 **서로 다른 스케줄이 같은 문자열이 된다** — 그러면
 * 07:00 알림 생성이 기존 `0 7-9 * * *` 알림과 중복이라며 차단된다.
 * 숫자 목록으로 확실히 읽히지 않으면 정규화를 포기하고 원본을 그대로 쓴다.
 */
export function normalizeCronForComparison(cron: string): string {
  const parsed = parseCronSchedule(cron);
  if (!parsed) return cron.trim().replace(/\s+/g, ' ');

  return `${parsed.minute} ${parsed.hours.join(',')} ${parsed.restFields.join(' ')}`;
}

function parseTimeInput(timeInput: string): { hour: number; minute: number } | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(timeInput.trim());
  if (!match) return null;

  const hour = parseInt(match[1], 10);
  const minute = parseInt(match[2], 10);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;

  return { hour, minute };
}

/**
 * 5필드 cron을 **숫자로 확실히 읽힐 때만** 분/시각으로 분해한다.
 *
 * 화면에서 이 계약을 각자 다시 구현하면 갈라진다 — `alert-schedule-utils.ts`가
 * 자체 파서를 쓰다가 `*​/5`를 0분으로, 겹친 공백을 0시로 읽어 실재하지 않는
 * 시각을 예고했다. 파서는 여기 하나만 둔다.
 */
export function parseCronSchedule(
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

/**
 * `parseInt('10-30')`은 NaN이 아니라 `10`이다. 범위·스텝을 분으로 읽어버리면
 * 화면이 실제로는 울리지 않는 시각을 예고한다 — 시각 필드와 같은 규칙으로
 * 순수 숫자만 받는다.
 */
function parseMinute(field: string): number | null {
  if (!/^\d+$/.test(field.trim())) return null;
  const num = parseInt(field.trim(), 10);
  return num >= 0 && num <= 59 ? num : null;
}

/**
 * `"7"` · `"7,18"`처럼 **순수한 숫자 목록일 때만** 값을 돌려준다.
 *
 * `parseInt('7-9')`는 NaN이 아니라 `7`이다. 범위(`7-9`)나 스텝(`*​/2`)을
 * 숫자로 읽어버리면 호출부가 그 스케줄을 "07시 단일 알림"으로 오해하고,
 * 저장 시 범위를 조용히 지운다. 해석할 수 없으면 실패로 알린다.
 */
/**
 * 시각 필드를 숫자 목록으로 읽는다. 범위·스텝은 실패로 돌려준다 —
 * 저장 경로가 그것을 숫자로 오해하면 범위를 조용히 지우기 때문이다.
 */
export function parseCronHourList(field: string): number[] | null {
  return parseNumericList(field);
}

/**
 * 분 필드가 **처음 발화하는 분**. 표시 전용이다.
 *
 * `parseCronSchedule`(엄격)은 크론을 다시 쓸 때 쓴다 — 거기서 `10-30`을 10으로
 * 읽으면 저장 시 범위가 사라진다. 반대로 "다음 알림"을 보여줄 때는 읽을 수 있는
 * 만큼 읽어야 한다. 실패로 처리하면 실제로 울리는 알림이 화면에서 사라진다.
 *
 * `*`·`*​/5`는 0분부터, `10-30`은 10분부터, `15,45`는 15분부터 울린다.
 */
export function earliestCronMinute(field: string): number | null {
  const trimmed = field.trim();
  if (!trimmed) return null;

  const candidates: number[] = [];
  for (const part of trimmed.split(',')) {
    const piece = part.trim();
    const [value, step] = piece.split('/');
    if (step !== undefined && !/^\d+$/.test(step)) return null;

    if (value === '*') {
      candidates.push(0);
      continue;
    }

    const range = /^(\d+)-(\d+)$/.exec(value);
    if (range) {
      const start = parseInt(range[1], 10);
      const end = parseInt(range[2], 10);
      if (start > end || end > 59) return null;
      candidates.push(start);
      continue;
    }

    if (!/^\d+$/.test(value)) return null;
    const num = parseInt(value, 10);
    if (num < 0 || num > 59) return null;
    candidates.push(num);
  }

  return candidates.length > 0 ? Math.min(...candidates) : null;
}

function parseNumericList(field: string): number[] | null {
  if (field === '*') return null;

  const values: number[] = [];

  for (const part of field.split(',')) {
    const trimmed = part.trim();
    if (!/^\d+$/.test(trimmed)) return null;
    const value = parseInt(trimmed, 10);
    if (value < 0 || value > 23) return null;
    values.push(value);
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
