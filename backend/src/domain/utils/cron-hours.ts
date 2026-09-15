/**
 * 크론 시각 필드 읽기 — 하루에 여러 번 울리는 알림을 위한 것.
 *
 * `0 7,18 * * *`(출근+퇴근)는 이 도메인의 정식 형태다. 웹 편집 모달은 시각을
 * 하나 고쳐도 나머지 시각을 일부러 보존하고(`cron-utils.ts:62`), EventBridge는
 * `cron(0 7,18 ? * * *)`로 두 시각 모두에 발화한다.
 *
 * 순수한 숫자 목록일 때만 값을 돌려준다 — 웹 `parseCronHourList`와 같은 계약이다.
 * `parseInt('7-9')`는 NaN이 아니라 `7`이라, 범위·스텝을 숫자로 읽으면 실재하지
 * 않는 단일 시각으로 오해한다. 읽을 수 없으면 빈 배열로 알리고 호출부가 정한다.
 */
export function parseCronHours(schedule: string): number[] {
  if (!schedule || typeof schedule !== 'string') return [];

  const fields = schedule.trim().split(/\s+/);
  if (fields.length !== 5) return [];

  const hours: number[] = [];
  for (const part of fields[1].split(',')) {
    const piece = part.trim();
    if (!/^\d+$/.test(piece)) return [];
    const hour = parseInt(piece, 10);
    if (hour < 0 || hour > 23) return [];
    hours.push(hour);
  }

  return [...new Set(hours)].sort((a, b) => a - b);
}

/**
 * 예정된 시각들 중 **이번 발화에 해당하는** 시각.
 *
 * 가장 최근에 지나간 예정 시각을 고른다. 재시도로 발송이 예정 시각을 조금
 * 넘겨도 예정 시각 쪽을 유지하고(현재 시각만 보면 11:55 알림의 재시도가 12시를
 * 넘겨 저녁으로 뒤집힌다), 하루 두 번 울리는 알림은 7시 발화와 18시 발화를
 * 제대로 갈라 준다.
 */
export function resolveFiringHour(scheduledHours: number[], nowHourKST: number): number | null {
  if (scheduledHours.length === 0) return null;

  let closest = scheduledHours[0];
  let smallestGap = Number.POSITIVE_INFINITY;

  for (const hour of scheduledHours) {
    const gap = (nowHourKST - hour + 24) % 24;
    if (gap < smallestGap) {
      smallestGap = gap;
      closest = hour;
    }
  }

  return closest;
}
