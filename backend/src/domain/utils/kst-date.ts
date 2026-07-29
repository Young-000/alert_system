/**
 * KST (한국 표준시, UTC+9) 날짜 유틸리티
 * 스트릭 계산은 서버에서만 수행하며, 모든 날짜는 KST 기준이다.
 */

const KST_OFFSET_MINUTES = 9 * 60;

const DAY_NAMES_KO = ['일', '월', '화', '수', '목', '금', '토'];

/**
 * 주어진 시각을 KST 벽시계로 옮긴 Date.
 * 반환값은 getUTC* 계열로만 읽어야 한다 (서버 로컬 TZ 영향 배제).
 */
function toKSTWallClock(date: Date): Date {
  return new Date(date.getTime() + KST_OFFSET_MINUTES * 60_000);
}

/** 한국 시간 기준 오늘 날짜 (YYYY-MM-DD) */
export function getTodayKST(): string {
  const now = new Date();
  const kst = new Date(now.getTime() + (KST_OFFSET_MINUTES + now.getTimezoneOffset()) * 60000);
  return formatDateToString(kst);
}

/** 주간 시작일 (월요일) 계산 — KST 기준 */
export function getWeekStartKST(dateStr: string): string {
  const date = parseDateString(dateStr);
  const day = date.getDay(); // 0=일, 1=월, ..., 6=토
  const diff = day === 0 ? 6 : day - 1; // 월요일 기준 오프셋
  date.setDate(date.getDate() - diff);
  return formatDateToString(date);
}

/** N일 전 날짜 계산 */
export function subtractDays(dateStr: string, days: number): string {
  const date = parseDateString(dateStr);
  date.setDate(date.getDate() - days);
  return formatDateToString(date);
}

/** 날짜에 N일 추가 */
export function addDays(dateStr: string, days: number): string {
  const date = parseDateString(dateStr);
  date.setDate(date.getDate() + days);
  return formatDateToString(date);
}

/**
 * 주어진 날짜 기준 weekOffset만큼 이전 주의 월요일~일요일 범위 반환
 * weekOffset=0: 이번 주, weekOffset=1: 지난주, ...
 */
export function getWeekBounds(
  todayKST: string,
  weekOffset: number,
): { weekStart: string; weekEnd: string } {
  const currentWeekStart = getWeekStartKST(todayKST);
  const offsetDays = weekOffset * 7;
  const weekStart = subtractDays(currentWeekStart, offsetDays);
  const weekEnd = addDays(weekStart, 6);
  return { weekStart, weekEnd };
}

/** 주차 라벨 생성: "2월 3주차" 형태 */
export function formatWeekLabel(weekStartDate: string): string {
  const date = parseDateString(weekStartDate);
  const month = date.getMonth() + 1;
  const weekOfMonth = Math.ceil(date.getDate() / 7);
  return `${month}월 ${weekOfMonth}주차`;
}

/**
 * 한국 시간 기준 요일 (0=일, 1=월, ..., 6=토)
 * 서버 TZ가 UTC여도 KST 요일을 반환한다.
 */
export function getDayOfWeekKST(date: Date = new Date()): number {
  return toKSTWallClock(date).getUTCDay();
}

/** 한국 시간 기준 시(0-23) — 서버 TZ와 무관 */
export function getHoursKST(date: Date = new Date()): number {
  return toKSTWallClock(date).getUTCHours();
}

/** 알림 문구용 한국어 날짜: "7월 29일 화요일" */
export function formatKoreanDateKST(date: Date = new Date()): string {
  const kst = toKSTWallClock(date);
  const dayName = DAY_NAMES_KO[kst.getUTCDay()];
  return `${kst.getUTCMonth() + 1}월 ${kst.getUTCDate()}일 ${dayName}요일`;
}

/**
 * 날짜 전용(date) 값을 'YYYY-MM-DD' 문자열로 정규화한다.
 *
 * TypeORM은 `type: 'date'` 컬럼을 Date가 아니라 'YYYY-MM-DD' **문자열**로 hydrate한다
 * (PostgresDriver.prepareHydratedValue → DateUtils.mixedDateToDateString).
 * 엔티티에 `Date`로 선언돼 있어도 DB에서 읽어온 값에는 getDay() 같은 Date 메서드가 없다.
 * 반대로 애플리케이션이 직접 만든 값은 Date(순간)이므로 양쪽을 모두 받는다.
 *
 * Date는 KST 달력 날짜로 환산한다 — 서버 TZ가 UTC여도 한국 기준 날짜를 얻기 위함이다.
 */
export function toDateOnlyKST(value: Date | string): string {
  if (value instanceof Date) {
    const kst = toKSTWallClock(value);
    const month = String(kst.getUTCMonth() + 1).padStart(2, '0');
    const day = String(kst.getUTCDate()).padStart(2, '0');
    return `${kst.getUTCFullYear()}-${month}-${day}`;
  }
  return String(value).slice(0, 10);
}

/** 'YYYY-MM-DD' 문자열의 요일 (0=일, 1=월, ..., 6=토) — 서버 TZ 무관 */
export function getDayOfWeekFromDateOnly(dateStr: string): number {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

/** 'YYYY-MM-DD' 문자열의 월 (1-12) — 서버 TZ 무관 */
export function getMonthFromDateOnly(dateStr: string): number {
  return Number(dateStr.slice(5, 7));
}

/** 한국 시간 기준 분(0-59) — 서버 TZ와 무관 */
export function getMinutesKST(date: Date = new Date()): number {
  return toKSTWallClock(date).getUTCMinutes();
}

/**
 * 한국 시간 기준 'HH:mm' 표기 — 서버 TZ와 무관.
 * 사용자에게 보여줄 시각은 항상 이 함수로 만든다.
 */
export function formatTimeKST(date: Date): string {
  const hours = String(getHoursKST(date)).padStart(2, '0');
  const minutes = String(getMinutesKST(date)).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * 한국 시간 기준 'YYYYMMDD' 표기 — 서버 TZ와 무관.
 * 기상청(KMA) API의 base_date·fcstDate는 KST 달력 날짜다.
 */
export function formatDateCompactKST(date: Date = new Date()): string {
  return toDateOnlyKST(date).replace(/-/g, '');
}

/**
 * KST 달력 날짜('YYYY-MM-DD')의 특정 시각에 해당하는 절대 시각(Date).
 *
 * KST는 UTC+9이므로 UTC 기준으로 9시간을 뺀다. hour가 9보다 작으면
 * `Date.UTC`가 자동으로 전날로 롤백한다 (KST 08:00 = UTC 전날 23:00).
 */
export function atTimeKST(dateStr: string, hour: number, minute = 0): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day, hour - 9, minute));
}

/** YYYY-MM-DD 문자열을 KST Date 객체로 변환 */
export function toDateKST(dateStr: string, endOfDay = false): Date {
  const time = endOfDay ? 'T23:59:59+09:00' : 'T00:00:00+09:00';
  return new Date(dateStr + time);
}

/** YYYY-MM-DD 문자열을 Date 객체로 변환 (내부용, 로컬 시간) */
function parseDateString(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/** Date 객체를 YYYY-MM-DD 문자열로 변환 */
function formatDateToString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
