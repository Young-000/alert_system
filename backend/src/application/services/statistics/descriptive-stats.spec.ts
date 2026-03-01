import {
  mean,
  weightedMean,
  variance,
  stdDev,
  percentile,
  median,
  exponentialWeightedMean,
  clamp,
  timeToMinutes,
  minutesToTime,
} from './descriptive-stats';

describe('descriptive-stats', () => {
  describe('mean', () => {
    it('빈 배열이면 0을 반환한다', () => {
      expect(mean([])).toBe(0);
    });

    it('단일 값의 평균은 그 값 자체이다', () => {
      expect(mean([42])).toBe(42);
    });

    it('여러 값의 산술 평균을 계산한다', () => {
      expect(mean([10, 20, 30])).toBe(20);
    });

    it('소수점을 포함한 평균을 계산한다', () => {
      expect(mean([1, 2, 3, 4])).toBe(2.5);
    });
  });

  describe('weightedMean', () => {
    it('빈 배열이면 0을 반환한다', () => {
      expect(weightedMean([], [])).toBe(0);
    });

    it('동일 가중치에서 산술 평균과 같다', () => {
      expect(weightedMean([10, 20, 30], [1, 1, 1])).toBe(20);
    });

    it('가중치가 다르면 가중 평균을 계산한다', () => {
      // (10*3 + 20*1) / (3+1) = 50/4 = 12.5
      expect(weightedMean([10, 20], [3, 1])).toBe(12.5);
    });

    it('모든 가중치가 0이면 0을 반환한다', () => {
      expect(weightedMean([10, 20], [0, 0])).toBe(0);
    });

    it('길이가 다른 배열은 짧은 쪽에 맞춘다', () => {
      expect(weightedMean([10, 20, 30], [1, 1])).toBe(15);
    });
  });

  describe('variance', () => {
    it('값이 2개 미만이면 0을 반환한다', () => {
      expect(variance([])).toBe(0);
      expect(variance([42])).toBe(0);
    });

    it('모집단 분산을 계산한다 (기본값)', () => {
      // values: [2, 4, 4, 4, 5, 5, 7, 9], mean=5, var=4
      expect(variance([2, 4, 4, 4, 5, 5, 7, 9])).toBe(4);
    });

    it('표본 분산을 계산한다', () => {
      // sample variance = sum((x-mean)^2) / (n-1)
      // [2, 4, 4, 4, 5, 5, 7, 9] → 32/7 ≈ 4.571
      const result = variance([2, 4, 4, 4, 5, 5, 7, 9], false);
      expect(result).toBeCloseTo(4.571, 2);
    });

    it('모든 값이 같으면 분산은 0이다', () => {
      expect(variance([5, 5, 5, 5])).toBe(0);
    });
  });

  describe('stdDev', () => {
    it('분산의 제곱근이다', () => {
      expect(stdDev([2, 4, 4, 4, 5, 5, 7, 9])).toBe(2);
    });

    it('값이 1개 이하이면 0을 반환한다', () => {
      expect(stdDev([])).toBe(0);
      expect(stdDev([42])).toBe(0);
    });
  });

  describe('percentile', () => {
    it('빈 배열이면 0을 반환한다', () => {
      expect(percentile([], 50)).toBe(0);
    });

    it('단일 값이면 항상 그 값을 반환한다', () => {
      expect(percentile([42], 0)).toBe(42);
      expect(percentile([42], 50)).toBe(42);
      expect(percentile([42], 100)).toBe(42);
    });

    it('0번째 백분위수는 최소값이다', () => {
      expect(percentile([1, 2, 3, 4, 5], 0)).toBe(1);
    });

    it('100번째 백분위수는 최대값이다', () => {
      expect(percentile([1, 2, 3, 4, 5], 100)).toBe(5);
    });

    it('50번째 백분위수(중앙값)를 계산한다', () => {
      expect(percentile([1, 2, 3, 4, 5], 50)).toBe(3);
    });

    it('보간을 사용한다', () => {
      // [1, 2, 3, 4], p=25 => index=0.75 => 1 + 0.75*(2-1) = 1.75
      expect(percentile([1, 2, 3, 4], 25)).toBe(1.75);
    });

    it('범위 밖 퍼센트를 클램프한다', () => {
      expect(percentile([1, 2, 3], -10)).toBe(1);
      expect(percentile([1, 2, 3], 110)).toBe(3);
    });
  });

  describe('median', () => {
    it('홀수 개 값의 중앙값을 구한다', () => {
      expect(median([3, 1, 2])).toBe(2);
    });

    it('짝수 개 값의 중앙값을 보간한다', () => {
      expect(median([1, 2, 3, 4])).toBe(2.5);
    });
  });

  describe('exponentialWeightedMean', () => {
    it('빈 배열이면 0을 반환한다', () => {
      expect(exponentialWeightedMean([])).toBe(0);
    });

    it('최신 값에 더 높은 가중치를 부여한다', () => {
      // values: [10, 20], decay=0.5
      // weights: [1, 0.5]
      // weighted mean: (10*1 + 20*0.5) / (1 + 0.5) = 20/1.5 ≈ 13.33
      const result = exponentialWeightedMean([10, 20], 0.5);
      expect(result).toBeCloseTo(13.33, 1);
    });

    it('decay=1이면 산술 평균과 같다', () => {
      expect(exponentialWeightedMean([10, 20, 30], 1)).toBe(20);
    });
  });

  describe('clamp', () => {
    it('범위 내 값은 그대로 반환한다', () => {
      expect(clamp(5, 0, 10)).toBe(5);
    });

    it('최소값 아래는 최소값으로 클램프한다', () => {
      expect(clamp(-1, 0, 10)).toBe(0);
    });

    it('최대값 위는 최대값으로 클램프한다', () => {
      expect(clamp(15, 0, 10)).toBe(10);
    });
  });

  describe('timeToMinutes', () => {
    it('08:00은 480분이다', () => {
      expect(timeToMinutes('08:00')).toBe(480);
    });

    it('00:00은 0분이다', () => {
      expect(timeToMinutes('00:00')).toBe(0);
    });

    it('23:59는 1439분이다', () => {
      expect(timeToMinutes('23:59')).toBe(1439);
    });
  });

  describe('minutesToTime', () => {
    it('480분은 08:00이다', () => {
      expect(minutesToTime(480)).toBe('08:00');
    });

    it('0분은 00:00이다', () => {
      expect(minutesToTime(0)).toBe('00:00');
    });

    it('1439분은 23:59이다', () => {
      expect(minutesToTime(1439)).toBe('23:59');
    });

    it('음수는 하루를 돌아서 계산한다', () => {
      expect(minutesToTime(-10)).toBe('23:50');
    });

    it('1440 이상은 하루를 돌아서 계산한다', () => {
      expect(minutesToTime(1450)).toBe('00:10');
    });
  });
});
