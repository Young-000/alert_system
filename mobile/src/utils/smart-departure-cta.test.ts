import { describe, expect, it } from 'vitest';

import { canAddSetting } from './smart-departure-cta';

describe('canAddSetting', () => {
  it('설정이 이미 있으면 나머지 유형을 더 만들 수 있다', () => {
    expect(
      canAddSetting({ loadError: null, hasSettings: true, hasRoutes: false }),
    ).toBe(true);
  });

  it('경로가 있으면 첫 설정을 만들 수 있다', () => {
    expect(
      canAddSetting({ loadError: null, hasSettings: false, hasRoutes: true }),
    ).toBe(true);
  });

  it('설정도 경로도 없으면 만들 것이 없다', () => {
    expect(
      canAddSetting({ loadError: null, hasSettings: false, hasRoutes: false }),
    ).toBe(false);
  });

  // 조회에 실패하면 `settings`는 빈 배열로 남는다. 경로만 성공한 흔한 경우에
  // `hasRoutes`가 true라서, 예전에는 에러 배너 아래에 "출근 설정 추가"가 같이
  // 떴다. 이미 출근 설정을 만들어 둔 사용자가 그걸 누르면 서버가 409
  // `이미 출근 설정이 존재합니다.`로 거절한다 — 실패가 예정된 폼이다.
  it('설정을 못 불러왔으면 경로가 있어도 권하지 않는다', () => {
    expect(
      canAddSetting({
        loadError: '스마트 출발 설정을 불러올 수 없어요',
        hasSettings: false,
        hasRoutes: true,
      }),
    ).toBe(false);
  });

  // 경로 조회만 실패한 경우도 마찬가지다. 설정 폼은 경로를 골라야 저장되는데
  // 고를 목록이 비어 있어 저장까지 갈 수 없다.
  it('경로를 못 불러왔으면 설정이 있어도 권하지 않는다', () => {
    expect(
      canAddSetting({
        loadError: '경로를 불러올 수 없어요',
        hasSettings: true,
        hasRoutes: false,
      }),
    ).toBe(false);
  });
});
