/**
 * 좌표 → 에어코리아 시도명 매핑.
 *
 * AirQualityApiClient와 CachedAirQualityApiClient가 같은 판정을 쓰도록 공유한다
 * (복제본이 서로 다른 판정 순서로 드리프트했던 사고의 재발 방지).
 */
export function getSidoNameFromCoords(lat: number, lng: number): string {
  // 서울: 37.4~37.7, 126.8~127.2
  if (lat >= 37.4 && lat <= 37.7 && lng >= 126.8 && lng <= 127.2) {
    return '서울';
  }
  // 인천: 37.4~37.6, 126.5~126.8
  // 경기 범위에 완전히 포함되므로 반드시 경기보다 먼저 판정해야 한다.
  if (lat >= 37.4 && lat <= 37.6 && lng >= 126.5 && lng <= 126.8) {
    return '인천';
  }
  // 경기: 37.0~38.0, 126.5~127.5
  if (lat >= 37.0 && lat <= 38.0 && lng >= 126.5 && lng <= 127.5) {
    return '경기';
  }
  // 기본값: 서울
  return '서울';
}
