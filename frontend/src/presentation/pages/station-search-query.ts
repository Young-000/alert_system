/**
 * 역·정류장 검색어의 최소 길이. 앞뒤 공백을 뺀 기준이다.
 *
 * 서버가 이 값으로 조회 여부를 정한다 — 두 글자 미만이면 외부 API를 부르지 않고
 * 빈 배열을 돌려준다(`search-subway-stations.use-case.ts:14`,
 * `search-bus-stops.use-case.ts:14`, `bus-stop-api.client.ts:38`).
 *
 * 화면이 이 기준을 모르면 그 빈 배열을 "그런 역이 없다"로 옮겨 적게 된다.
 * 아직 묻지 않은 것과 물어봤더니 없는 것은 다르다.
 */
export const MIN_STATION_QUERY_LENGTH = 2;

/** 이 검색어로 서버가 실제 조회를 하는가. 검색 요청과 '결과 없음' 문구의 공통 기준. */
export function isSearchableStationQuery(query: string): boolean {
  return query.trim().length >= MIN_STATION_QUERY_LENGTH;
}
