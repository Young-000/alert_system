/**
 * KST (한국 표준시, UTC+9) 날짜 유틸리티
 * 스트릭 계산은 서버에서만 수행하며, 모든 날짜는 KST 기준이다.
 */

const KST_OFFSET_MINUTES = 9 * 60;

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
