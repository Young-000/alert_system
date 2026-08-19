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
