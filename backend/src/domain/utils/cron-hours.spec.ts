import { parseCronHours, resolveFiringHour } from './cron-hours';

describe('parseCronHours', () => {
  it('단일 시각을 읽는다', () => {
    expect(parseCronHours('0 8 * * *')).toEqual([8]);
  });

  it('쉼표 목록을 오름차순으로 읽는다', () => {
    expect(parseCronHours('0 18,7 * * *')).toEqual([7, 18]);
  });

  it('중복된 시각은 한 번만 남긴다', () => {
    expect(parseCronHours('0 7,7 * * *')).toEqual([7]);
  });

  /**
   * `parseInt('7-9')`는 `7`이다. 범위를 단일 시각으로 읽으면 9시 발화가
   * 7시 것으로 오해된다 — 읽을 수 없다고 알리는 편이 낫다.
   */
  it('범위·스텝·와일드카드는 읽지 않는다', () => {
    expect(parseCronHours('0 7-9 * * *')).toEqual([]);
    expect(parseCronHours('0 */2 * * *')).toEqual([]);
    expect(parseCronHours('0 * * * *')).toEqual([]);
  });

  it('5필드가 아니면 읽지 않는다', () => {
    expect(parseCronHours('08:00')).toEqual([]);
    expect(parseCronHours('0 8 * *')).toEqual([]);
    expect(parseCronHours('')).toEqual([]);
  });

  it('시각 범위를 벗어나면 읽지 않는다', () => {
    expect(parseCronHours('0 24 * * *')).toEqual([]);
  });
});

describe('resolveFiringHour', () => {
  it('예정 시각이 없으면 null', () => {
    expect(resolveFiringHour([], 9)).toBeNull();
  });

  it('하루 두 번 울리면 방금 지나간 쪽을 고른다', () => {
    expect(resolveFiringHour([7, 18], 18)).toBe(18);
    expect(resolveFiringHour([7, 18], 7)).toBe(7);
  });

  it('예정 시각을 조금 넘겨도 그 시각을 유지한다', () => {
    expect(resolveFiringHour([11], 12)).toBe(11);
    expect(resolveFiringHour([7, 18], 19)).toBe(18);
  });

  /** 자정을 넘겨 되돌아가는 경우 — 어제 저녁 발화가 가장 최근이다. */
  it('자정을 넘어가도 가장 최근 발화를 고른다', () => {
    expect(resolveFiringHour([7, 18], 6)).toBe(18);
    expect(resolveFiringHour([23], 1)).toBe(23);
  });
});
