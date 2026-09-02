import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MissionSettingsPage } from './MissionSettingsPage';
import { missionApiClient } from '@infrastructure/api';
import type { Mission } from '@infrastructure/api';
import type { Mocked } from 'vitest';
import { TestProviders } from '../../../test-utils';

vi.mock('@infrastructure/api');

vi.mock('@presentation/hooks/useAuth', () => ({
  useAuth: () => ({ userId: 'user-1', isLoggedIn: true }),
  notifyAuthChange: vi.fn(),
}));

const mockMissionApiClient = missionApiClient as Mocked<typeof missionApiClient>;

function mission(id: string, title: string, sortOrder: number): Mission {
  return {
    id,
    userId: 'user-1',
    title,
    emoji: '📌',
    missionType: 'commute',
    sortOrder,
    isActive: true,
  } as Mission;
}

function renderPage(): ReturnType<typeof render> {
  return render(
    <TestProviders>
      <MissionSettingsPage />
    </TestProviders>,
  );
}

describe('MissionSettingsPage — 순서 변경', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMissionApiClient.getMissions.mockResolvedValue([
      mission('m1', '첫 번째 미션', 0),
      mission('m2', '두 번째 미션', 1),
    ]);
  });

  it('두 미션의 sortOrder를 맞바꾼다', async () => {
    mockMissionApiClient.reorder.mockImplementation((id, sortOrder) =>
      Promise.resolve(mission(id, id, sortOrder)),
    );
    renderPage();

    const moveUp = await screen.findByLabelText('두 번째 미션 위로 이동');
    await userEvent.click(moveUp);

    await waitFor(() => {
      expect(mockMissionApiClient.reorder).toHaveBeenCalledTimes(2);
    });
    expect(mockMissionApiClient.reorder).toHaveBeenNthCalledWith(1, 'm2', 0);
    expect(mockMissionApiClient.reorder).toHaveBeenNthCalledWith(2, 'm1', 1);
  });

  it('순서 변경이 실패하면 사용자에게 알린다', async () => {
    mockMissionApiClient.reorder.mockRejectedValue(new Error('network down'));
    renderPage();

    const moveUp = await screen.findByLabelText('두 번째 미션 위로 이동');
    await userEvent.click(moveUp);

    expect(await screen.findByRole('alert')).toHaveTextContent('순서 변경에 실패');
  });

  it('첫 요청이 실패하면 두 번째 요청을 보내지 않는다 (순서 깨짐 방지)', async () => {
    mockMissionApiClient.reorder.mockRejectedValue(new Error('network down'));
    renderPage();

    const moveUp = await screen.findByLabelText('두 번째 미션 위로 이동');
    await userEvent.click(moveUp);

    await screen.findByRole('alert');
    expect(mockMissionApiClient.reorder).toHaveBeenCalledTimes(1);
  });
});

describe('MissionSettingsPage — 활성/비활성 토글', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMissionApiClient.getMissions.mockResolvedValue([
      mission('m1', '첫 번째 미션', 0),
    ]);
  });

  it('토글이 실패하면 사용자에게 알린다', async () => {
    // 순서 변경(reorderError)·삭제(deleteError)·저장(saveError)은 실패를 표면화하는데
    // 토글만 fire-and-forget이라 조용히 삼켰다. 전역 onError는 로깅만 한다.
    mockMissionApiClient.toggleActive.mockRejectedValue(new Error('500'));
    renderPage();

    const toggle = await screen.findByRole('switch', { name: '첫 번째 미션 비활성화' });
    await userEvent.click(toggle);

    expect(await screen.findByRole('alert')).toHaveTextContent('상태 변경에 실패');
  });

  it('토글이 성공하면 에러를 띄우지 않는다', async () => {
    mockMissionApiClient.toggleActive.mockResolvedValue(
      mission('m1', '첫 번째 미션', 0),
    );
    renderPage();

    const toggle = await screen.findByRole('switch', { name: '첫 번째 미션 비활성화' });
    await userEvent.click(toggle);

    await waitFor(() => {
      expect(mockMissionApiClient.toggleActive).toHaveBeenCalledTimes(1);
    });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

describe('MissionSettingsPage — 저장 실패 사유 전달', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('서버가 준 저장 거절 사유를 그대로 보여준다', async () => {
    // 추가 버튼은 상한(3개)에서 잠기지만, 다른 탭·기기에서 먼저 만들면
    // 목록이 낡은 채로 4번째 요청이 나가 서버가 400 + 사유로 거절한다.
    // 고정 문구 '저장에 실패했습니다. 다시 시도해주세요.'는 이때 틀린 안내다 —
    // 다시 시도해도 상한은 그대로라 매번 같은 실패만 돌아온다.
    mockMissionApiClient.getMissions.mockResolvedValue([
      mission('m1', '영어 단어', 1),
      mission('m2', '뉴스 읽기', 2),
    ]);
    mockMissionApiClient.createMission.mockRejectedValue(
      new Error(
        'API Error 400: {"message":"commute 미션은 최대 3개까지 설정할 수 있습니다"}',
      ),
    );
    const user = userEvent.setup();

    renderPage();
    await user.click(await screen.findByRole('button', { name: '출근 미션 추가' }));
    await user.type(screen.getByLabelText('미션 이름'), '독서하기');
    await user.click(screen.getByRole('button', { name: '추가' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'commute 미션은 최대 3개까지 설정할 수 있습니다',
      );
    });
  });

  it('사유를 못 꺼내면 기존 문구로 되돌아간다', async () => {
    // 대조군 — 본문 없는 실패까지 빈 문구로 만들지 않는다.
    mockMissionApiClient.getMissions.mockResolvedValue([
      mission('m1', '영어 단어', 1),
    ]);
    mockMissionApiClient.createMission.mockRejectedValue(new Error('boom'));
    const user = userEvent.setup();

    renderPage();
    await user.click(await screen.findByRole('button', { name: '출근 미션 추가' }));
    await user.type(screen.getByLabelText('미션 이름'), '독서하기');
    await user.click(screen.getByRole('button', { name: '추가' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        '저장에 실패했습니다. 다시 시도해주세요.',
      );
    });
  });
});
