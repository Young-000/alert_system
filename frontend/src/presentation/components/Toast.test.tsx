import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useToast } from './Toast';

describe('useToast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-10T00:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('같은 밀리초에 올라온 토스트도 서로 다른 id를 받는다', () => {
    // id가 Date.now()뿐이면 연달아 부른 두 건이 같은 id가 된다.
    // ToastContainer는 id를 key로 쓰고 dismiss도 id로 거르므로,
    // 충돌하면 하나를 닫을 때 둘 다 사라진다.
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.success('경로가 저장되었습니다');
      result.current.error('알림 생성에 실패했습니다');
    });

    expect(result.current.toasts).toHaveLength(2);
    const [first, second] = result.current.toasts;
    expect(first.id).not.toBe(second.id);
  });

  it('한 건을 닫아도 나머지는 남는다', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.success('첫 번째');
      result.current.success('두 번째');
    });

    act(() => {
      result.current.dismissToast(result.current.toasts[0].id);
    });

    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0].message).toBe('두 번째');
  });

  it('타입별 헬퍼가 해당 타입으로 토스트를 만든다', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.success('성공');
    });
    act(() => {
      result.current.warning('주의');
    });

    expect(result.current.toasts.map((t) => t.type)).toEqual([
      'success',
      'warning',
    ]);
  });
});
