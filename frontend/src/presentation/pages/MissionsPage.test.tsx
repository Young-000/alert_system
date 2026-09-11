import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MissionsPage } from './MissionsPage';
import { missionApiClient } from '@infrastructure/api';
import type { DailyStatus, WeeklyStats } from '@infrastructure/api';
import type { Mocked } from 'vitest';
import { TestProviders } from '../../test-utils';

vi.mock('@infrastructure/api');

vi.mock('@presentation/hooks/useAuth', () => ({
  useAuth: () => {
    const userId = localStorage.getItem('userId') || '';
    return {
      userId,
      userName: '회원',
      userEmail: '',
      phoneNumber: '',
      isLoggedIn: !!userId,
    };
  },
  notifyAuthChange: vi.fn(),
}));

const mockMissionApi = missionApiClient as Mocked<typeof missionApiClient>;

const mockDailyStatus: DailyStatus = {
  commuteMissions: [
    {
      mission: {
        id: 'mission-1',
        userId: 'user-1',
        title: '물 마시기',
        emoji: '💧',
        missionType: 'commute',
        isActive: true,
        sortOrder: 1,
        createdAt: '2026-08-01T00:00:00Z',
        updatedAt: '2026-08-01T00:00:00Z',
      },
      record: null,
      isCompleted: false,
    },
  ],
  returnMissions: [],
  completionRate: 0,
  streakDay: 0,
};

const mockWeeklyStats: WeeklyStats = {
  totalCompleted: 0,
  totalMissions: 0,
  completionRate: 0,
  dailyScores: [],
};

function renderPage(): ReturnType<typeof render> {
  return render(
    <TestProviders>
      <MissionsPage />
    </TestProviders>
  );
}

describe('MissionsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('userId', 'user-1');
    mockMissionApi.getDailyStatus.mockResolvedValue(mockDailyStatus);
    mockMissionApi.getWeeklyStats.mockResolvedValue(mockWeeklyStats);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should render daily missions', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('물 마시기')).toBeInTheDocument();
    });
  });

  it('should render missions while weekly stats are still loading', async () => {
    // 주간 통계는 부가 위젯이다. 그것이 느리다고 핵심 행동(미션 체크)까지
    // 스켈레톤 뒤에 갇히면 안 된다.
    mockMissionApi.getWeeklyStats.mockReturnValue(new Promise<WeeklyStats>(() => {}));

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('물 마시기')).toBeInTheDocument();
    });
    expect(screen.getByRole('checkbox', { name: /물 마시기/ })).toBeEnabled();
  });

  it('should show feedback when mission check toggle fails', async () => {
    mockMissionApi.toggleCheck.mockRejectedValue(new Error('network'));

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('물 마시기')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('checkbox', { name: /물 마시기/ }));

    // 실패가 무음이면 사용자는 반복 탭만 하게 된다 — 피드백이 있어야 한다
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
    expect(screen.getByRole('alert').textContent).toContain('실패');
  });
});

describe('MissionsPage — 주간 통계 조회 실패', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('userId', 'user-1');
    mockMissionApi.getDailyStatus.mockResolvedValue(mockDailyStatus);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('주간 통계 조회가 실패하면 실패를 알리고 다시 시도할 수 있다', async () => {
    // 실패도 data=undefined라 `weeklyStats ? ... : null`이 섹션을 통째로 지운다.
    // 사용자가 보는 것은 어제까지 있던 "이번 주"가 사라진 화면이다.
    mockMissionApi.getWeeklyStats.mockRejectedValue(new Error('network'));

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('물 마시기')).toBeInTheDocument();
    });

    expect(await screen.findByText('주간 통계를 불러오지 못했어요.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '다시 시도' })).toBeInTheDocument();
  });

  it('다시 시도를 누르면 주간 통계를 다시 받아 그린다', async () => {
    mockMissionApi.getWeeklyStats.mockRejectedValueOnce(new Error('network'));

    renderPage();

    const retryButton = await screen.findByRole('button', { name: '다시 시도' });

    mockMissionApi.getWeeklyStats.mockResolvedValue(mockWeeklyStats);
    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(screen.getByText('이번 주')).toBeInTheDocument();
    });
    expect(screen.queryByText('주간 통계를 불러오지 못했어요.')).not.toBeInTheDocument();
  });

  it('주간 통계가 정상이면 실패 문구 없이 그린다', async () => {
    // 대조군 — 과잉 반응으로 번지지 않는 것을 고정한다.
    mockMissionApi.getWeeklyStats.mockResolvedValue(mockWeeklyStats);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('이번 주')).toBeInTheDocument();
    });
    expect(screen.queryByText('주간 통계를 불러오지 못했어요.')).not.toBeInTheDocument();
  });

  it('주간 통계가 아직 로딩 중이면 실패 문구를 띄우지 않는다', async () => {
    // 대조군 — 로딩과 실패의 경계. 로딩 중 실패 문구가 뜨면 거짓말이다.
    mockMissionApi.getWeeklyStats.mockReturnValue(new Promise<WeeklyStats>(() => {}));

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('물 마시기')).toBeInTheDocument();
    });
    expect(screen.queryByText('주간 통계를 불러오지 못했어요.')).not.toBeInTheDocument();
  });
});
