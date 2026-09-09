import { render, screen } from '@testing-library/react';
import { EditAlertModal } from './EditAlertModal';

/**
 * 회귀 방지: 알림 이름 입력에 상한이 없었다.
 *
 * 서버 `alerts.name`은 varchar(255)다. 상한 없는 입력에 256자를 붙여넣고 저장하면
 * 요청이 그대로 나가고, `use-alert-crud`의 `catch`는 사유를 구분하지 않으므로
 * 화면에는 "수정에 실패했습니다"만 뜬다 — 이름이 길어서 막혔다는 걸 알 방법이 없다.
 *
 * 모바일 쪽 같은 폼(`AlertFormModal`)은 `maxLength={30}`으로 이미 막혀 있었다.
 * 웹만 열려 있던 비대칭이다.
 */
describe('EditAlertModal - 알림 이름 길이', () => {
  const baseProps = {
    editForm: { name: '출근 알림', schedule: '08:00' },
    originalSchedule: '0 8 * * 1-5',
    isEditing: false,
    onFormChange: vi.fn(),
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
  };

  it('이름 입력이 서버 상한(255자)을 넘겨 입력받지 않는다', () => {
    render(<EditAlertModal {...baseProps} />);

    const input = screen.getByLabelText('알림 이름');

    expect(input).toHaveAttribute('maxLength', '255');
  });

  it('이름이 비면 저장 버튼이 열리지 않는다 (대조군)', () => {
    render(
      <EditAlertModal {...baseProps} editForm={{ name: '   ', schedule: '08:00' }} />,
    );

    expect(screen.getByRole('button', { name: '저장' })).toBeDisabled();
  });
});

/**
 * 회귀 방지: 수정 실패 사유가 화면에 도달하지 않았다.
 *
 * `use-alert-crud`의 `handleEditConfirm`은 실패하면 `setError(...)`로 사유를 세우지만,
 * 이 모달은 `error`를 받지 않았다. 사유를 그리는 다른 자리(`TypeSelectionStep`·
 * `ConfirmStep`)는 위저드 안에 있고, 위저드는 알림이 하나라도 있으면 닫혀 있다
 * (`AlertSettingsPage.tsx:193`). 수정은 목록에서만 열리므로 알림은 반드시 1개 이상이다
 * — 즉 실패 사유가 렌더되는 표면이 하나도 없었다. 저장을 눌러도 모달이 그대로 있고
 * 아무 설명이 없어, 같은 버튼을 다시 누르는 것 말고 할 수 있는 일이 없었다.
 */
describe('EditAlertModal - 실패 사유 표시', () => {
  const baseProps = {
    editForm: { name: '출근 알림', schedule: '08:00' },
    originalSchedule: '0 8 * * 1-5',
    isEditing: false,
    onFormChange: vi.fn(),
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
  };

  it('사유를 받으면 모달 안에 알림으로 띄운다', () => {
    render(<EditAlertModal {...baseProps} error="알림을 찾을 수 없습니다." />);

    expect(screen.getByRole('alert')).toHaveTextContent('알림을 찾을 수 없습니다.');
  });

  it('사유가 없으면 빈 자리를 만들지 않는다 (대조군)', () => {
    render(<EditAlertModal {...baseProps} />);

    expect(screen.queryByRole('alert')).toBeNull();
  });
});
