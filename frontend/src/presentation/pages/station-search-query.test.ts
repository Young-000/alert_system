import { describe, it, expect } from 'vitest';
import { isSearchableStationQuery, MIN_STATION_QUERY_LENGTH } from './station-search-query';

describe('isSearchableStationQuery', () => {
  it('서버와 같은 기준을 쓴다 — 앞뒤 공백을 뺀 두 글자', () => {
    expect(MIN_STATION_QUERY_LENGTH).toBe(2);
  });

  it.each(['', ' ', '  ', '강', '강 ', ' 강', '  강  '])(
    '%o 는 검색하지 않는다',
    (query) => {
      expect(isSearchableStationQuery(query)).toBe(false);
    },
  );

  it.each(['강남', ' 강남', '강남 ', '강남역', '시청 앞'])(
    '%o 는 검색한다',
    (query) => {
      expect(isSearchableStationQuery(query)).toBe(true);
    },
  );
});
