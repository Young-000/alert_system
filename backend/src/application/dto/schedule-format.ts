/**
 * 스케줄러가 EventBridge 스케줄로 **변환할 수 있는** 형식인지.
 *
 * `EventBridgeSchedulerService.convertToEventBridgeCron`이 실제로 처리하는 집합과
 * 같아야 한다. 예전에는 DTO가 cron-parser로만 검증해서 더 넓은 집합을 통과시켰고,
 * 그 틈(초 필드를 포함한 6필드 · `@daily` 같은 매크로)에 걸리는 값은 알림 행이
 * 저장된 뒤 스케줄 등록에서 던져 **400이 아니라 500**이 됐다.
 *
 * 그래서 판정을 여기 하나만 두고 검증과 변환이 같은 함수를 본다 — 각자 구현하면
 * 다시 갈라진다.
 */
export function isSchedulerConvertible(schedule: string): boolean {
  if (!schedule || typeof schedule !== 'string') return false;

  const trimmed = schedule.trim();

  // 이미 EventBridge 표현식
  if (trimmed.startsWith('cron(') || trimmed.startsWith('rate(')) return true;

  // 시각만 준 형식 (매일 그 시각으로 변환된다)
  if (/^\d{2}:\d{2}$/.test(trimmed)) return true;

  // 표준 5필드 크론
  return trimmed.split(/\s+/).length === 5;
}
