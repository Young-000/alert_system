import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ConfirmStep } from './ConfirmStep';
import type { SelectedStop, ValidationResult } from './types';

type Props = Parameters<typeof ConfirmStep>[0];

const STOPS: SelectedStop[] = [
  { id: '1', uniqueKey: 'k1', name: '강남', line: '2호선', transportMode: 'subway' },
  { id: '2', uniqueKey: 'k2', name: '교대', line: '3호선', transportMode: 'subway' },
];

const VALID: ValidationResult = { isValid: true, errors: [], warnings: [] };

function renderStep(overrides: Partial<Props> = {}) {
  const onSave = vi.fn();
  const props: Props = {
    routeType: 'morning',
    selectedStops: STOPS,
    editingRoute: null,
    routeName: '',
    defaultRouteName: '출근 경로',
    createReverse: false,
    isSaving: false,
    error: '',
    validation: VALID,
    onRouteNameChange: vi.fn(),
    onCreateReverseChange: vi.fn(),
    onSave,
    onStepChange: vi.fn(),
    getTransferInfo: () => null,
    ...overrides,
  };
  render(<ConfirmStep {...props} />);
  return { onSave };
}

const BLOCKING_ERROR =
  '강남역(2호선)에서 교대역(3호선)으로 직접 이동할 수 없습니다. 환승역을 추가해주세요.';

describe('ConfirmStep (route-setup)', () => {
  it('저장을 막는 검증 실패 사유를 화면에 띄운다', () => {
    // 저장 버튼이 disabled면 handleSave가 실행되지 않아 페이지의 `error`가
    // 채워지지 않는다. 사유를 여기서 그리지 않으면 화면에 흔적이 0이다.
    renderStep({
      validation: { isValid: false, errors: [BLOCKING_ERROR], warnings: [] },
    });

    expect(screen.getByText(BLOCKING_ERROR)).toBeInTheDocument();
  });

  it('검증에 실패하면 저장 버튼이 비활성화된다', () => {
    renderStep({
      validation: { isValid: false, errors: [BLOCKING_ERROR], warnings: [] },
    });

    expect(screen.getByRole('button', { name: '경로 저장' })).toBeDisabled();
  });

  it('검증을 통과하면 사유 문구가 없다', () => {
    renderStep();

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '경로 저장' })).toBeEnabled();
  });

  it('사유가 여러 개여도 하나만 보여준다 — 같은 화면에서 같은 말을 반복하지 않는다', () => {
    // 인접 중복은 중복 검사와 연속 구간 검사 양쪽에서 걸려 사유가 두 줄로 쌓인다.
    renderStep({
      validation: {
        isValid: false,
        errors: ['"강남 2호선" 역이 중복되었습니다', '강남역 2호선이 연속으로 중복되었습니다'],
        warnings: [],
      },
    });

    expect(screen.getByText('"강남 2호선" 역이 중복되었습니다')).toBeInTheDocument();
    expect(
      screen.queryByText('강남역 2호선이 연속으로 중복되었습니다'),
    ).not.toBeInTheDocument();
  });

  it('저장 중 오류(page error)와 검증 사유를 겹쳐 그리지 않는다', () => {
    renderStep({
      error: '경로 저장에 실패했습니다',
      validation: { isValid: false, errors: [BLOCKING_ERROR], warnings: [] },
    });

    expect(screen.getByText('경로 저장에 실패했습니다')).toBeInTheDocument();
    expect(screen.queryByText(BLOCKING_ERROR)).not.toBeInTheDocument();
  });
});
