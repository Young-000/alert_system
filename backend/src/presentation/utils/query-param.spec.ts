import { BadRequestException } from '@nestjs/common';
import {
  MAX_LATITUDE,
  MAX_LONGITUDE,
  parseBoundedInt,
  parseCoordinate,
  parseConditionDate,
  parseConditionInt,
} from './query-param';

describe('parseBoundedInt', () => {
  const opts = { fallback: 20, min: 1, max: 100 };

  it('값이 없으면 기본값을 쓴다', () => {
    expect(parseBoundedInt(undefined, opts)).toBe(20);
    expect(parseBoundedInt('', opts)).toBe(20);
  });

  it('숫자로 읽을 수 없으면 기본값을 쓴다', () => {
    expect(parseBoundedInt('abc', opts)).toBe(20);
    expect(parseBoundedInt('NaN', opts)).toBe(20);
  });

  it('범위 안의 값은 그대로 통과한다', () => {
    expect(parseBoundedInt('37', opts)).toBe(37);
  });

  it('상한을 넘으면 max로 자른다', () => {
    expect(parseBoundedInt('99999', opts)).toBe(100);
  });

  // 이 클램프가 없으면 그대로 `LIMIT -1`이 되어 Postgres에서 500이 난다.
  it('음수는 min으로 끌어올린다', () => {
    expect(parseBoundedInt('-1', opts)).toBe(1);
    expect(parseBoundedInt('-99999', opts)).toBe(1);
  });

  it('min이 0인 파라미터(offset)에서는 0까지 허용한다', () => {
    const offsetOpts = { fallback: 0, min: 0, max: 10_000 };
    expect(parseBoundedInt('0', offsetOpts)).toBe(0);
    expect(parseBoundedInt('-5', offsetOpts)).toBe(0);
  });

  it('0은 기본값이 아니라 min으로 보정된다 (`|| fallback` 관용구와 다른 지점)', () => {
    expect(parseBoundedInt('0', opts)).toBe(1);
  });

  it('소수점은 버린다', () => {
    expect(parseBoundedInt('7.9', opts)).toBe(7);
  });

  it('앞뒤 공백이 섞여도 읽는다', () => {
    expect(parseBoundedInt(' 42 ', opts)).toBe(42);
  });
});

describe('parseCoordinate', () => {
  it('값이 없으면 undefined', () => {
    expect(parseCoordinate(undefined, MAX_LATITUDE)).toBeUndefined();
    expect(parseCoordinate('', MAX_LATITUDE)).toBeUndefined();
  });

  it('숫자로 읽을 수 없으면 undefined (NaN을 하류로 흘리지 않는다)', () => {
    expect(parseCoordinate('abc', MAX_LATITUDE)).toBeUndefined();
  });

  it('유효 좌표는 소수점까지 보존한다', () => {
    expect(parseCoordinate('37.5665', MAX_LATITUDE)).toBe(37.5665);
    expect(parseCoordinate('-126.978', MAX_LONGITUDE)).toBe(-126.978);
  });

  it('경계값은 유효하다', () => {
    expect(parseCoordinate('90', MAX_LATITUDE)).toBe(90);
    expect(parseCoordinate('-90', MAX_LATITUDE)).toBe(-90);
    expect(parseCoordinate('180', MAX_LONGITUDE)).toBe(180);
  });

  // 클램프하면 요청한 적 없는 위치의 날씨를 사실인 양 돌려주게 된다 — 그래서 버린다.
  it('범위를 벗어나면 클램프가 아니라 undefined다', () => {
    expect(parseCoordinate('999', MAX_LATITUDE)).toBeUndefined();
    expect(parseCoordinate('-500', MAX_LONGITUDE)).toBeUndefined();
  });
});

describe('parseConditionInt', () => {
  it('정상 숫자는 그대로 통과한다', () => {
    expect(parseConditionInt('12', 'temperature')).toBe(12);
    expect(parseConditionInt('-5', 'temperature')).toBe(-5);
    expect(parseConditionInt('0', 'temperature')).toBe(0);
  });

  /**
   * `parseInt(raw, 10) || 0`은 해석 실패를 0으로 바꾼다. 이 파라미터들은
   * "안 보냄"과 "0"의 의미가 다르다 — `?temperature=abc`가 0°C(영하) 조건의
   * 예측으로 조용히 바뀌면, 사용자는 요청한 적 없는 답을 정상 결과로 받는다.
   */
  it('해석 불가는 0으로 바꾸지 않고 거절한다', () => {
    expect(() => parseConditionInt('abc', 'temperature')).toThrow(BadRequestException);
    expect(() => parseConditionInt('', 'temperature')).toThrow(BadRequestException);
  });

  it('거절 메시지에 문제된 파라미터 이름이 들어간다', () => {
    expect(() => parseConditionInt('abc', 'transitDelay')).toThrow(/transitDelay/);
  });
});

describe('parseConditionDate', () => {
  it('정상 날짜는 Date로 파싱된다', () => {
    const parsed = parseConditionDate('2026-08-11', 'date');
    expect(parsed.getTime()).toBe(new Date('2026-08-11').getTime());
  });

  /**
   * `new Date('abc')`는 Invalid Date이고 거기서 뽑은 요일은 NaN이다.
   * NaN은 어떤 요일과도 같지 않아 요일 보정이 통째로 건너뛰어지는데,
   * 응답은 정상 예측과 구분되지 않는다.
   */
  it('해석 불가는 Invalid Date로 흘려보내지 않고 거절한다', () => {
    expect(() => parseConditionDate('garbage', 'date')).toThrow(BadRequestException);
    expect(() => parseConditionDate('2026-13-45', 'date')).toThrow(BadRequestException);
  });

  it('거절 메시지에 문제된 파라미터 이름이 들어간다', () => {
    expect(() => parseConditionDate('garbage', 'date')).toThrow(/date/);
  });
});
