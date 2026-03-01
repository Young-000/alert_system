import { linearRegression } from './linear-regression';

describe('linear-regression', () => {
  it('빈 입력이면 빈 결과를 반환한다', () => {
    const result = linearRegression([], []);
    expect(result.coefficients).toEqual([]);
    expect(result.rSquared).toBe(0);
    expect(result.intercept).toBe(0);
  });

  it('단순 선형 회귀 — 완벽한 선형 관계 (y = 2x + 1)', () => {
    const X = [[1], [2], [3], [4], [5]];
    const Y = [3, 5, 7, 9, 11]; // y = 2x + 1

    const result = linearRegression(X, Y);

    expect(result.intercept).toBeCloseTo(1, 5);
    expect(result.coefficients).toHaveLength(1);
    expect(result.coefficients[0]).toBeCloseTo(2, 5);
    expect(result.rSquared).toBeCloseTo(1, 5);
  });

  it('다중 회귀 — 2개 특성 (y = 3x1 + 2x2 + 5)', () => {
    const X = [
      [1, 1],
      [2, 1],
      [1, 2],
      [2, 2],
      [3, 1],
      [1, 3],
    ];
    const Y = X.map(([x1, x2]) => 3 * x1 + 2 * x2 + 5);

    const result = linearRegression(X, Y);

    expect(result.intercept).toBeCloseTo(5, 3);
    expect(result.coefficients[0]).toBeCloseTo(3, 3);
    expect(result.coefficients[1]).toBeCloseTo(2, 3);
    expect(result.rSquared).toBeCloseTo(1, 3);
  });

  it('3개 특성 회귀 (날씨 시나리오: rain, snow, temp)', () => {
    // y = -8*rain - 14*snow - 0.5*temp + 0
    const X = [
      [1, 0, 5],   // rainy, 5C
      [0, 0, 10],  // clear, 10C
      [0, 1, -3],  // snowy, -3C
      [1, 0, -2],  // rainy, -2C
      [0, 0, 20],  // clear, 20C
      [0, 1, 0],   // snowy, 0C
      [1, 0, 15],  // rainy, 15C
    ];
    const Y = X.map(([rain, snow, temp]) => -8 * rain - 14 * snow - 0.5 * temp);

    const result = linearRegression(X, Y);

    expect(result.coefficients[0]).toBeCloseTo(-8, 2);   // rain
    expect(result.coefficients[1]).toBeCloseTo(-14, 2);  // snow
    expect(result.coefficients[2]).toBeCloseTo(-0.5, 2); // temp
    expect(result.rSquared).toBeCloseTo(1, 3);
  });

  it('노이즈가 있는 데이터에서 R-squared < 1', () => {
    const X = [[1], [2], [3], [4], [5]];
    const Y = [2.1, 3.9, 6.2, 7.8, 10.1]; // 약간의 노이즈

    const result = linearRegression(X, Y);

    expect(result.coefficients[0]).toBeGreaterThan(1.5);
    expect(result.coefficients[0]).toBeLessThan(2.5);
    expect(result.rSquared).toBeGreaterThan(0.95);
    expect(result.rSquared).toBeLessThan(1);
  });

  it('샘플 수가 특성 수보다 적으면 0을 반환한다', () => {
    const X = [[1, 2, 3]];
    const Y = [10];

    const result = linearRegression(X, Y);

    expect(result.coefficients).toEqual([0, 0, 0]);
    expect(result.rSquared).toBe(0);
  });

  it('addIntercept=false이면 절편 없이 계산한다', () => {
    // y = 2x (원점 통과)
    const X = [[1], [2], [3], [4]];
    const Y = [2, 4, 6, 8];

    const result = linearRegression(X, Y, false);

    expect(result.intercept).toBe(0);
    expect(result.coefficients[0]).toBeCloseTo(2, 5);
    expect(result.rSquared).toBeCloseTo(1, 5);
  });

  it('X와 Y 길이 불일치 시 에러를 던진다', () => {
    expect(() => linearRegression([[1], [2]], [1, 2, 3])).toThrow();
  });

  it('상수 Y이면 R-squared=0이다', () => {
    const X = [[1], [2], [3], [4], [5]];
    const Y = [5, 5, 5, 5, 5];

    const result = linearRegression(X, Y);

    expect(result.rSquared).toBe(0);
    expect(result.coefficients[0]).toBeCloseTo(0, 5);
    expect(result.intercept).toBeCloseTo(5, 5);
  });

  it('4x4 행렬 역행렬 — Gauss-Jordan 경로를 사용한다', () => {
    // 4 features: need addIntercept to create 5x5 matrix
    const X = [
      [1, 0, 0, 0],
      [0, 1, 0, 0],
      [0, 0, 1, 0],
      [0, 0, 0, 1],
      [1, 1, 0, 0],
      [0, 0, 1, 1],
    ];
    const Y = X.map(([a, b, c, d]) => 2 * a + 3 * b + 4 * c + 5 * d + 1);

    const result = linearRegression(X, Y);

    expect(result.intercept).toBeCloseTo(1, 2);
    expect(result.coefficients[0]).toBeCloseTo(2, 2);
    expect(result.coefficients[1]).toBeCloseTo(3, 2);
    expect(result.coefficients[2]).toBeCloseTo(4, 2);
    expect(result.coefficients[3]).toBeCloseTo(5, 2);
  });
});
