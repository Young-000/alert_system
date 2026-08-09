const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_NAMES_KR = ['일', '월', '화', '수', '목', '금', '토'] as const;

/**
 * 브라우저 로컬 시각이 아니라 KST로 고정한 "지금".
 *
 * 미션 데이터는 백엔드가 전부 KST 기준으로 만든다 (`kst-date.ts`,
 * `mission-stats.use-case.ts`의 todayKST). 화면이 로컬 시각으로 오늘을
 * 계산하면 KST와 날짜가 갈리는 시간대(예: UTC 23시)에 헤더 날짜와
 * 주간 그리드의 '오늘' 강조가 실제 데이터와 하루씩 어긋난다.
 */
function toKstParts(now: Date): { month: number; date: number; dayOfWeek: number } {
  const kst = new Date(now.getTime() + KST_OFFSET_MS);
  return {
    month: kst.getUTCMonth() + 1,
    date: kst.getUTCDate(),
    dayOfWeek: kst.getUTCDay(),
  };
}

/** "8월 2일 (일)" — KST 기준. */
export function formatTodayKST(now: Date = new Date()): string {
  const { month, date, dayOfWeek } = toKstParts(now);
  return `${month}월 ${date}일 (${DAY_NAMES_KR[dayOfWeek]})`;
}

/** 주간 그리드용 요일 인덱스 (월=0 … 일=6), KST 기준. */
export function getTodayKstDayIndex(now: Date = new Date()): number {
  const { dayOfWeek } = toKstParts(now);
  return dayOfWeek === 0 ? 6 : dayOfWeek - 1;
}

/**
 * 'YYYY-MM-DD' 문자열의 요일 인덱스 (월=0 … 일=6).
 *
 * 백엔드가 내려주는 날짜는 이미 KST 달력상의 날짜다. 따라서 시각을 끼워
 * 파싱하지 않고 연·월·일만 그대로 읽어야 한다 —
 * `new Date(dateStr + 'T00:00:00+09:00').getDay()`는 브라우저 로컬 시각으로
 * 되돌려 읽기 때문에 UTC 브라우저에서 하루 밀린다.
 */
export function getKstDayOfWeek(dateStr: string): number {
  const [year, month, date] = dateStr.split('-').map(Number);
  const day = new Date(Date.UTC(year, month - 1, date)).getUTCDay();
  return day === 0 ? 6 : day - 1;
}
