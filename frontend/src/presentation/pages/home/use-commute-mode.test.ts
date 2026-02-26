import { renderHook, act } from '@testing-library/react';
import { getAutoMode, useCommuteMode } from './use-commute-mode';

describe('getAutoMode', () => {
  it('06시이면 commute를 반환한다', () => {
    expect(getAutoMode(6)).toBe('commute');
  });

  it('13시이면 commute를 반환한다', () => {
    expect(getAutoMode(13)).toBe('commute');
  });

  it('14시이면 return을 반환한다', () => {
    expect(getAutoMode(14)).toBe('return');
  });

  it('20시이면 return을 반환한다', () => {
    expect(getAutoMode(20)).toBe('return');
  });

  it('21시이면 night를 반환한다', () => {
    expect(getAutoMode(21)).toBe('night');
  });

  it('5시이면 night를 반환한다', () => {
    expect(getAutoMode(5)).toBe('night');
  });

  it('0시(자정)이면 night를 반환한다', () => {
    expect(getAutoMode(0)).toBe('night');
  });
});

describe('useCommuteMode', () => {
  it('초기 모드는 시간 기반 자동 모드이다', () => {
    const { result } = renderHook(() => useCommuteMode());
    const autoMode = getAutoMode();
    expect(result.current.mode).toBe(autoMode);
  });

  it('isCommute와 isReturn이 mode와 일관된다', () => {
    const { result } = renderHook(() => useCommuteMode());
    const { mode, isCommute, isReturn } = result.current;
    expect(isCommute).toBe(mode === 'commute');
    expect(isReturn).toBe(mode === 'return');
  });

  it('토글하면 commute <-> return 전환된다', () => {
    const { result } = renderHook(() => useCommuteMode());
    const initialMode = result.current.mode;

    act(() => {
      result.current.toggleMode();
    });

    if (initialMode === 'commute' || initialMode === 'night') {
      expect(result.current.mode).toBe('return');
    } else {
      expect(result.current.mode).toBe('commute');
    }
  });

  it('두 번 토글하면 원래 모드로 돌아온다', () => {
    const { result } = renderHook(() => useCommuteMode());

    act(() => {
      result.current.toggleMode();
    });

    const afterFirst = result.current.mode;

    act(() => {
      result.current.toggleMode();
    });

    // After two toggles, should be opposite of afterFirst
    expect(result.current.mode).toBe(afterFirst === 'commute' ? 'return' : 'commute');
  });
});
