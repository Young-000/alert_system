import { render, screen } from '@testing-library/react';
import { MissionQuickCard } from './MissionQuickCard';
import { missionApiClient } from '@infrastructure/api';
import type { DailyStatus, MissionWithRecord } from '@infrastructure/api';
import type { Mocked } from 'vitest';
import { TestProviders } from '../../../test-utils';

vi.mock('@infrastructure/api');

vi.mock('@presentation/hooks/useAuth', () => ({
  useAuth: () => ({ userId: 'user-1', isLoggedIn: true }),
  notifyAuthChange: vi.fn(),
}));

const mockMissionApiClient = missionApiClient as Mocked<typeof missionApiClient>;

function missionItem(id: string, title: string, isCompleted: boolean): MissionWithRecord {
  return {
    mission: {
      id,
      userId: 'user-1',
      title,
      emoji: '📌',
      missionType: 'commute',
      isActive: true,
      sortOrder: 0,
      createdAt: '2026-08-05T00:00:00.000Z',
      updatedAt: '2026-08-05T00:00:00.000Z',
    },
    record: null,
    isCompleted,
  };
}

/**
 * 서버(GET /missions/daily)가 실제로 내려주는 형태.
 * commuteMissions/returnMissions/completionRate/streakDay 네 필드뿐이고
 * 집계 수치(totalMissions·completedMissions)는 포함되지 않는다.
 */
function dailyStatus(overrides: Partial<DailyStatus> = {}): DailyStatus {
  return {
    commuteMissions: [
      missionItem('m1', '영어 단어', true),
      missionItem('m2', '뉴스 읽기', false),
    ],
    returnMissions: [missionItem('m3', '회고 쓰기', false)],
    completionRate: 33,
    streakDay: 4,
    ...overrides,
  };
}

describe('MissionQuickCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMissionApiClient.getWeeklyStats.mockResolvedValue({
      totalCompleted: 5,
      totalMissions: 15,
      completionRate: 33,
      dailyScores: [],
    });
    mockMissionApiClient.getStreak.mockResolvedValue({ streakDay: 4 });
  });

  it('미션이 있으면 체크 카드를 보여준다 (설정 유도 화면이 아니다)', async () => {
    mockMissionApiClient.getDailyStatus.mockResolvedValue(dailyStatus());

    render(
      <TestProviders>
        <MissionQuickCard />
      </TestProviders>,
    );

    expect(await screen.findByText('오늘의 미션 1/3')).toBeInTheDocument();
    expect(screen.queryByText('미션을 설정해보세요!')).not.toBeInTheDocument();
  });

  it('미션 진행률을 미션 배열에서 계산한다', async () => {
    mockMissionApiClient.getDailyStatus.mockResolvedValue(
      dailyStatus({
        commuteMissions: [
          missionItem('m1', '영어 단어', true),
          missionItem('m2', '뉴스 읽기', true),
        ],
        returnMissions: [missionItem('m3', '회고 쓰기', false)],
      }),
    );

    render(
      <TestProviders>
        <MissionQuickCard />
      </TestProviders>,
    );

    const bar = await screen.findByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuenow', '67');
  });

  it('로딩 중에는 설정 유도 화면을 먼저 보여주지 않는다', async () => {
    // 로딩 중 totalMissions를 0으로 읽어 "설정해보세요"를 깜빡 노출하면
    // 이미 미션이 있는 사용자에게 잘못된 안내가 스쳐 지나간다.
    let resolveStatus: (value: DailyStatus) => void = () => {};
    mockMissionApiClient.getDailyStatus.mockReturnValue(
      new Promise<DailyStatus>((resolve) => {
        resolveStatus = resolve;
      }),
    );

    render(
      <TestProviders>
        <MissionQuickCard />
      </TestProviders>,
    );

    expect(screen.queryByText('미션을 설정해보세요!')).not.toBeInTheDocument();

    resolveStatus(dailyStatus());
    expect(await screen.findByText('오늘의 미션 1/3')).toBeInTheDocument();
  });

  it('미션이 하나도 없을 때만 설정 유도 화면을 보여준다', async () => {
    mockMissionApiClient.getDailyStatus.mockResolvedValue(
      dailyStatus({ commuteMissions: [], returnMissions: [], completionRate: 0 }),
    );

    render(
      <TestProviders>
        <MissionQuickCard />
      </TestProviders>,
    );

    expect(await screen.findByText('미션을 설정해보세요!')).toBeInTheDocument();
    expect(screen.queryByText(/오늘의 미션/)).not.toBeInTheDocument();
  });
});
