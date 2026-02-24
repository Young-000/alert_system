import { renderHook, act } from '@testing-library/react';
import { useCollapsible } from './use-collapsible';

describe('useCollapsible', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('기본 상태가 defaultExpanded=false와 일치한다', () => {
    const { result } = renderHook(() =>
      useCollapsible({ storageKey: 'test', defaultExpanded: false }),
    );
    expect(result.current.isExpanded).toBe(false);
  });

  it('기본 상태가 defaultExpanded=true와 일치한다', () => {
    const { result } = renderHook(() =>
      useCollapsible({ storageKey: 'test', defaultExpanded: true }),
    );
    expect(result.current.isExpanded).toBe(true);
  });

  it('defaultExpanded 미지정 시 false가 기본값이다', () => {
    const { result } = renderHook(() =>
      useCollapsible({ storageKey: 'test' }),
    );
    expect(result.current.isExpanded).toBe(false);
  });

  it('toggle() 호출 시 상태가 반전된다', () => {
    const { result } = renderHook(() =>
      useCollapsible({ storageKey: 'test', defaultExpanded: false }),
    );

    expect(result.current.isExpanded).toBe(false);

    act(() => {
      result.current.toggle();
    });

    expect(result.current.isExpanded).toBe(true);

    act(() => {
      result.current.toggle();
    });

    expect(result.current.isExpanded).toBe(false);
  });

  it('localStorage에 상태를 저장한다', () => {
    const { result } = renderHook(() =>
      useCollapsible({ storageKey: 'weather', defaultExpanded: false }),
    );

    act(() => {
      result.current.toggle();
    });

    expect(localStorage.getItem('home_collapsible_weather')).toBe('true');

    act(() => {
      result.current.toggle();
    });

    expect(localStorage.getItem('home_collapsible_weather')).toBe('false');
  });

  it('localStorage에서 저장된 상태를 복원한다', () => {
    localStorage.setItem('home_collapsible_stats', 'true');

    const { result } = renderHook(() =>
      useCollapsible({ storageKey: 'stats', defaultExpanded: false }),
    );

    expect(result.current.isExpanded).toBe(true);
  });

  it('localStorage 값이 없으면 defaultExpanded를 사용한다', () => {
    const { result } = renderHook(() =>
      useCollapsible({ storageKey: 'new-section', defaultExpanded: true }),
    );

    expect(result.current.isExpanded).toBe(true);
  });

  it('ariaProps의 aria-expanded가 isExpanded와 동기화된다', () => {
    const { result } = renderHook(() =>
      useCollapsible({ storageKey: 'test', defaultExpanded: false }),
    );

    expect(result.current.ariaProps['aria-expanded']).toBe(false);

    act(() => {
      result.current.toggle();
    });

    expect(result.current.ariaProps['aria-expanded']).toBe(true);
  });

  it('ariaProps에 role, tabIndex가 포함된다', () => {
    const { result } = renderHook(() =>
      useCollapsible({ storageKey: 'test' }),
    );

    expect(result.current.ariaProps.role).toBe('button');
    expect(result.current.ariaProps.tabIndex).toBe(0);
  });

  it('Enter 키로 토글 동작한다', () => {
    const { result } = renderHook(() =>
      useCollapsible({ storageKey: 'test', defaultExpanded: false }),
    );

    const event = {
      key: 'Enter',
      preventDefault: vi.fn(),
    } as unknown as React.KeyboardEvent;

    act(() => {
      result.current.ariaProps.onKeyDown(event);
    });

    expect(event.preventDefault).toHaveBeenCalled();
    expect(result.current.isExpanded).toBe(true);
  });

  it('Space 키로 토글 동작한다', () => {
    const { result } = renderHook(() =>
      useCollapsible({ storageKey: 'test', defaultExpanded: false }),
    );

    const event = {
      key: ' ',
      preventDefault: vi.fn(),
    } as unknown as React.KeyboardEvent;

    act(() => {
      result.current.ariaProps.onKeyDown(event);
    });

    expect(event.preventDefault).toHaveBeenCalled();
    expect(result.current.isExpanded).toBe(true);
  });

  it('다른 키는 토글하지 않는다', () => {
    const { result } = renderHook(() =>
      useCollapsible({ storageKey: 'test', defaultExpanded: false }),
    );

    const event = {
      key: 'Tab',
      preventDefault: vi.fn(),
    } as unknown as React.KeyboardEvent;

    act(() => {
      result.current.ariaProps.onKeyDown(event);
    });

    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(result.current.isExpanded).toBe(false);
  });

  it('onClick이 toggle을 호출한다', () => {
    const { result } = renderHook(() =>
      useCollapsible({ storageKey: 'test', defaultExpanded: false }),
    );

    act(() => {
      result.current.ariaProps.onClick();
    });

    expect(result.current.isExpanded).toBe(true);
  });

  it('localStorage 오류 시 기본값으로 fallback한다', () => {
    const getItemSpy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('Storage error');
    });

    const { result } = renderHook(() =>
      useCollapsible({ storageKey: 'test', defaultExpanded: true }),
    );

    expect(result.current.isExpanded).toBe(true);
    getItemSpy.mockRestore();
  });

  it('localStorage 쓰기 오류 시에도 상태 변경은 동작한다', () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Storage full');
    });

    const { result } = renderHook(() =>
      useCollapsible({ storageKey: 'test', defaultExpanded: false }),
    );

    act(() => {
      result.current.toggle();
    });

    // State still changes even if localStorage fails
    expect(result.current.isExpanded).toBe(true);
    setItemSpy.mockRestore();
  });
});
