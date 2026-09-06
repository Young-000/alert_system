import { describe, expect, it } from 'vitest';

import { getAqiStatus, resolveAqiDisplay } from './weather';

describe('resolveAqiDisplay', () => {
  it('미세먼지 값이 있으면 배지로 보여준다', () => {
    expect(resolveAqiDisplay(getAqiStatus(20), null)).toEqual({
      kind: 'value',
      label: '좋음',
    });
  });

  it('조회에 실패하면 실패 사유를 보여준다', () => {
    // pm10이 없으면 getAqiStatus는 '-'를 준다. 그 '-'를 그대로 배지에 찍으면
    // 사용자는 실패했다는 사실도, 다시 볼 방법도 알 수 없다 (웹은 사유를 띄운다).
    expect(resolveAqiDisplay(getAqiStatus(undefined), '미세먼지 정보 없음')).toEqual({
      kind: 'error',
      message: '미세먼지 정보 없음',
    });
  });

  it('값도 실패도 없으면 아무것도 보여주지 않는다', () => {
    expect(resolveAqiDisplay(getAqiStatus(undefined), null)).toEqual({
      kind: 'hidden',
    });
  });

  it('값이 있으면 과거 실패 사유보다 값을 우선한다', () => {
    expect(resolveAqiDisplay(getAqiStatus(200), '미세먼지 정보 없음')).toEqual({
      kind: 'value',
      label: '매우나쁨',
    });
  });
});
