import { describe, expect, it } from 'vitest';

import { resolveDepartureCardState } from './departure-card';

describe('resolveDepartureCardState', () => {
  it('불러오는 중이면 로딩', () => {
    expect(
      resolveDepartureCardState({ error: null, isLoading: true, hasSetting: false }),
    ).toBe('loading');
  });

  it('설정이 있으면 내용을 보여준다', () => {
    expect(
      resolveDepartureCardState({ error: null, isLoading: false, hasSetting: true }),
    ).toBe('ready');
  });

  it('설정이 정말 없으면 빈 상태', () => {
    expect(
      resolveDepartureCardState({ error: null, isLoading: false, hasSetting: false }),
    ).toBe('empty');
  });

  it('조회에 실패했으면 빈 상태가 아니라 실패로 본다', () => {
    // 실패를 빈 상태로 그리면 이미 설정한 사용자에게 "설정하기"를 권하게 되고,
    // 그 버튼을 누르면 서버가 409(이미 출근 설정이 존재합니다)로 거절한다.
    expect(
      resolveDepartureCardState({
        error: '출발 정보를 불러올 수 없어요',
        isLoading: false,
        hasSetting: false,
      }),
    ).toBe('error');
  });

  it('실패 후 재조회 중이면 로딩이 우선한다', () => {
    expect(
      resolveDepartureCardState({
        error: '출발 정보를 불러올 수 없어요',
        isLoading: true,
        hasSetting: false,
      }),
    ).toBe('loading');
  });

  it('실패했어도 직전 설정이 남아 있으면 그것을 보여준다', () => {
    expect(
      resolveDepartureCardState({
        error: '출발 정보를 불러올 수 없어요',
        isLoading: false,
        hasSetting: true,
      }),
    ).toBe('ready');
  });
});
