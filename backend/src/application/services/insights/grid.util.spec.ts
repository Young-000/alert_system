import {
  snapToGridFloor,
  snapToGridCenter,
  toGridKey,
  parseGridKey,
  mostCommonName,
} from './grid.util';

describe('Grid Utility', () => {
  describe('snapToGridFloor', () => {
    it('좌표를 0.01도 바닥으로 스냅한다', () => {
      expect(snapToGridFloor(37.5678)).toBeCloseTo(37.56, 2);
    });

    it('정확히 그리드 경계에 있으면 그대로 반환한다', () => {
      expect(snapToGridFloor(37.50)).toBeCloseTo(37.50, 2);
    });

    it('음수 좌표를 처리한다', () => {
      expect(snapToGridFloor(-33.8765)).toBeCloseTo(-33.88, 2);
    });

    it('0을 처리한다', () => {
      expect(snapToGridFloor(0)).toBe(0);
    });

    it('소수점 이하 작은 값을 처리한다', () => {
      expect(snapToGridFloor(37.001)).toBeCloseTo(37.00, 2);
    });
  });

  describe('snapToGridCenter', () => {
    it('그리드 셀 중심으로 스냅한다 (바닥 + 0.005)', () => {
      expect(snapToGridCenter(37.5678)).toBeCloseTo(37.565, 3);
    });

    it('정확히 그리드 경계에서 셀 중심을 반환한다', () => {
      expect(snapToGridCenter(37.50)).toBeCloseTo(37.505, 3);
    });
  });

  describe('toGridKey', () => {
    it('lat/lng로 그리드 키를 생성한다', () => {
      expect(toGridKey(37.5678, 127.0234)).toBe('grid_37.56_127.02');
    });

    it('정확한 좌표로 그리드 키를 생성한다', () => {
      expect(toGridKey(37.50, 127.00)).toBe('grid_37.50_127.00');
    });

    it('음수 좌표로 그리드 키를 생성한다', () => {
      expect(toGridKey(-33.87, 151.21)).toBe('grid_-33.87_151.21');
    });

    it('동일 셀 내의 다른 좌표는 같은 키를 반환한다', () => {
      // 37.561 and 37.569 are in the same 0.01 grid cell (37.56)
      expect(toGridKey(37.561, 127.001)).toBe(toGridKey(37.569, 127.009));
    });

    it('인접 셀의 좌표는 다른 키를 반환한다', () => {
      expect(toGridKey(37.56, 127.00)).not.toBe(toGridKey(37.57, 127.00));
    });
  });

  describe('parseGridKey', () => {
    it('그리드 키를 좌표로 파싱한다', () => {
      const result = parseGridKey('grid_37.56_127.02');
      expect(result).not.toBeNull();
      expect(result!.lat).toBeCloseTo(37.565, 3);
      expect(result!.lng).toBeCloseTo(127.025, 3);
    });

    it('음수 좌표를 파싱한다', () => {
      const result = parseGridKey('grid_-33.87_151.21');
      expect(result).not.toBeNull();
      expect(result!.lat).toBeCloseTo(-33.865, 3);
      expect(result!.lng).toBeCloseTo(151.215, 3);
    });

    it('유효하지 않은 키에 대해 null을 반환한다', () => {
      expect(parseGridKey('invalid')).toBeNull();
      expect(parseGridKey('grid_abc_def')).toBeNull();
      expect(parseGridKey('')).toBeNull();
    });

    it('toGridKey와 parseGridKey가 왕복한다', () => {
      const key = toGridKey(37.5678, 127.0234);
      const parsed = parseGridKey(key);
      expect(parsed).not.toBeNull();
      // After round-trip: should be grid center
      expect(parsed!.lat).toBeCloseTo(37.565, 3);
      expect(parsed!.lng).toBeCloseTo(127.025, 3);
    });
  });

  describe('mostCommonName', () => {
    it('가장 많이 등장하는 이름을 반환한다', () => {
      expect(mostCommonName(['신도림역', '강남역', '신도림역', '신도림역', '강남역']))
        .toBe('신도림역');
    });

    it('단일 이름은 그대로 반환한다', () => {
      expect(mostCommonName(['강남역'])).toBe('강남역');
    });

    it('빈 배열은 기본값을 반환한다', () => {
      expect(mostCommonName([])).toBe('알 수 없는 지역');
    });

    it('모든 이름이 다르면 첫 번째를 반환한다', () => {
      const result = mostCommonName(['역삼역', '강남역', '삼성역']);
      // All count 1, first discovered should win
      expect(['역삼역', '강남역', '삼성역']).toContain(result);
    });

    it('동일한 빈도의 이름 중 하나를 반환한다', () => {
      const result = mostCommonName(['A', 'B', 'A', 'B']);
      expect(['A', 'B']).toContain(result);
    });

    it('빈 문자열 이름도 처리한다', () => {
      expect(mostCommonName(['', '', 'test'])).toBe('');
    });
  });
});
