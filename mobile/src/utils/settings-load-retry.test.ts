import { describe, expect, it } from 'vitest';

import { shouldOfferLoadRetry } from './settings-load-retry';

describe('shouldOfferLoadRetry', () => {
  it('조회가 성공하면 다시 시도를 걸지 않는다', () => {
    expect(shouldOfferLoadRetry({ loadError: null, isLoading: false })).toBe(false);
  });

  it('조회가 실패했으면 다시 시도를 건다', () => {
    expect(
      shouldOfferLoadRetry({ loadError: '장소를 불러올 수 없어요', isLoading: false }),
    ).toBe(true);
  });

  it('아직 불러오는 중이면 다시 시도를 걸지 않는다', () => {
    // 로딩 중에는 실패 문구가 아직 화면에 없다. 여기서 버튼을 띄우면
    // 성공할 조회를 실패로 보이게 만든다.
    expect(
      shouldOfferLoadRetry({ loadError: '장소를 불러올 수 없어요', isLoading: true }),
    ).toBe(false);
  });

  it('실패 문구보다 앞서는 다른 안내가 떠 있으면 다시 시도를 걸지 않는다', () => {
    // 위치 권한 안내가 실패 문구를 덮는 자리다. 화면은 권한을 말하는데
    // 버튼은 장소 재조회를 한다면 두 개가 서로 다른 말을 한다.
    expect(
      shouldOfferLoadRetry({
        loadError: '장소를 불러올 수 없어요',
        isLoading: false,
        isSupersededByOtherNotice: true,
      }),
    ).toBe(false);
  });

  it('다른 안내가 떠 있어도 조회가 성공했으면 여전히 걸지 않는다', () => {
    expect(
      shouldOfferLoadRetry({
        loadError: null,
        isLoading: false,
        isSupersededByOtherNotice: true,
      }),
    ).toBe(false);
  });
});
