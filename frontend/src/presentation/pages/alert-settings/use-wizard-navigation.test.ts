import { renderHook, act } from '@testing-library/react';
import { useWizardNavigation } from './use-wizard-navigation';
import type { TransportItem } from './types';

const SUBWAY: TransportItem = {
  type: 'subway',
  id: 'S1',
  name: '강남역',
  detail: '2호선',
};

function props(overrides: Partial<Parameters<typeof useWizardNavigation>[0]> = {}) {
  return {
    wantsWeather: true,
    wantsTransport: false,
    transportTypes: [] as ('subway' | 'bus')[],
    selectedTransports: [] as TransportItem[],
    deleteTarget: null,
    isSubmitting: false,
    success: '',
    hasSchedule: true,
    onSubmit: vi.fn(),
    ...overrides,
  };
}

describe('useWizardNavigation — 단계 진행 조건', () => {
  it('유형을 하나도 고르지 않으면 진행할 수 없다', () => {
    const { result } = renderHook(() =>
      useWizardNavigation(props({ wantsWeather: false, wantsTransport: false })),
    );

    expect(result.current.canProceed()).toBe(false);
  });

  it('교통을 켜면 수단을 골라야 진행한다', () => {
    const { result } = renderHook(() =>
      useWizardNavigation(props({ wantsWeather: false, wantsTransport: true })),
    );

    act(() => result.current.setStep('transport'));
    expect(result.current.canProceed()).toBe(false);
  });
});

/**
 * 루틴 단계는 예전에 `return true`로 무조건 통과였다. 시각 입력을 비우면
 * (`<input type="time">`은 지우면 빈 문자열이 된다) 크론이 `"0  * * *"`가 되는데,
 * 그 상태로 확인 단계까지 가서 저장을 누를 수 있었다. 서버는 그 4필드를 통과시키고
 * EventBridge 변환에서 던져, 사용자는 원인을 알 수 없는 실패만 반복해서 봤다.
 *
 * 판단 근거는 `generateSchedule`이 만든 스케줄이다 — 시각 검증을 여기서 다시
 * 구현하면 저장 경로와 갈라진다.
 */
describe('useWizardNavigation — 루틴 단계의 시각 입력', () => {
  it('스케줄을 만들 수 없으면 확인 단계로 넘어가지 못한다', () => {
    const { result } = renderHook(() => useWizardNavigation(props({ hasSchedule: false })));

    act(() => result.current.setStep('routine'));
    expect(result.current.canProceed()).toBe(false);
  });

  it('스케줄이 있으면 넘어간다 (대조군)', () => {
    const { result } = renderHook(() => useWizardNavigation(props({ hasSchedule: true })));

    act(() => result.current.setStep('routine'));
    expect(result.current.canProceed()).toBe(true);
  });

  it('Enter 키도 같은 조건을 지킨다 — 버튼만 막으면 우회된다', () => {
    const { result } = renderHook(() => useWizardNavigation(props({ hasSchedule: false })));

    act(() => result.current.setStep('routine'));
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    });

    expect(result.current.step).toBe('routine');
  });

  it('Enter 키는 스케줄이 있으면 진행시킨다 (대조군)', () => {
    const { result } = renderHook(() => useWizardNavigation(props({ hasSchedule: true })));

    act(() => result.current.setStep('routine'));
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    });

    expect(result.current.step).toBe('confirm');
  });

  it('스케줄이 없으면 확인 단계에서 저장을 시작하지 않는다', () => {
    const onSubmit = vi.fn();
    const { result } = renderHook(() =>
      useWizardNavigation(props({ hasSchedule: false, onSubmit })),
    );

    act(() => result.current.setStep('confirm'));
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    });

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('스케줄이 있으면 확인 단계에서 저장한다 (대조군)', () => {
    const onSubmit = vi.fn();
    const { result } = renderHook(() =>
      useWizardNavigation(props({ hasSchedule: true, onSubmit })),
    );

    act(() => result.current.setStep('confirm'));
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    });

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('교통 단계는 스케줄과 무관하게 수단 선택으로 판단한다', () => {
    // 루틴 시각을 아직 안 정한 상태로 교통 단계를 지나는 것은 정상이다.
    const { result } = renderHook(() =>
      useWizardNavigation(
        props({
          wantsWeather: false,
          wantsTransport: true,
          transportTypes: ['subway'],
          selectedTransports: [SUBWAY],
          hasSchedule: false,
        }),
      ),
    );

    act(() => result.current.setStep('station'));
    expect(result.current.canProceed()).toBe(true);
  });
});
