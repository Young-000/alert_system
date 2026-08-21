/**
 * 도착 시각 표시 헬퍼.
 *
 * 백엔드가 내려주는 `arrivalTime`의 단위는 **초**다 (BusArrival·SubwayArrival 엔티티).
 * 버스/지하철 API의 "3분30초후" 같은 문자열을 API 클라이언트가 초로 환산해 채운다.
 * 화면에서 그 값을 그대로 "N분"으로 찍으면 3분 뒤 도착이 "180분"이 된다.
 *
 * 표기 규칙은 백엔드 `notification-message-builder.formatArrivalTime`과 같다 —
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
