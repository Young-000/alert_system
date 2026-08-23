/**
 * 도착 시각 표시 헬퍼 (웹 `frontend/src/presentation/utils/format-arrival.ts`의 이식본).
 *
 * `/bus/arrival/:stopId` · `/subway/arrival/:stationName`이 내려주는 `arrivalTime`의
 * 단위는 **초**다. 백엔드가 명시한 도메인 계약이며(`bus-api.client.ts` `parseArrivalTime`),
 * 두 컨트롤러 모두 변환 없이 그대로 통과시킨다. 그 값을 "N분"으로 찍으면
 * 3분 30초 뒤 도착이 **"210분"**이 된다.
 *
 * 주의 — 이름이 비슷한 위젯 데이터(`WidgetSubwayData.arrivalMinutes`)는 이미
 * 백엔드가 `Math.round(arrivalTime / 60)`으로 환산해 내려주므로 **분 단위**다.
 * 이 헬퍼를 거기에 쓰면 안 된다.
 *
 * 표기 규칙은 백엔드 `notification-message-builder.formatArrivalTime`·웹과 같다 —
 * 알림톡과 화면이 같은 도착 시각을 다르게 말하면 안 된다.
 */

/** 도착 임박으로 강조할 기준 (2분). */
export const ARRIVING_SOON_SECONDS = 120;

/** 60초 이하는 '곧 도착', 그 위는 '3분'처럼 분 단위로 내림. */
export function formatArrivalTime(seconds: number): string {
  if (seconds <= 60) return '곧 도착';
  return `${Math.floor(seconds / 60)}분`;
}

/** '곧 도착' 또는 '3분 후 도착'. */
export function formatArrivalWithSuffix(seconds: number): string {
  if (seconds <= 60) return '곧 도착';
  return `${Math.floor(seconds / 60)}분 후 도착`;
}

/** 2분 이하 남았는지 (0 이하는 시간 정보가 없다는 뜻이라 제외). */
export function isArrivingSoon(seconds: number): boolean {
  return seconds > 0 && seconds <= ARRIVING_SOON_SECONDS;
}

/**
 * 초 단위 도착 시각을 분으로 환산한다.
 * 조언 엔진(`briefing-advice.ts`)의 `arrivalMinutes` 임계값(≤3분)에 맞추는 용도로,
 * 백엔드 위젯 변환(`widget-data.service`)과 동일하게 반올림한다.
 */
export function toArrivalMinutes(seconds: number): number {
  return Math.round(seconds / 60);
}
