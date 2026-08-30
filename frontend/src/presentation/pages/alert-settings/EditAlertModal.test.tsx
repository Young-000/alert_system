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
