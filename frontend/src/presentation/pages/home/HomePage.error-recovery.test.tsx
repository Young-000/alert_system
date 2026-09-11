import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TestProviders } from '../../../test-utils';
import type { StreakResponse } from '@infrastructure/api/commute-api.client';
import { HomePage } from './HomePage';
import type { UseHomeDataReturn } from './use-home-data';

// 홈의 보조 위젯(스트릭·주간 리포트)이 조회에 실패했을 때
// 화면이 실패를 말하고 다시 시도할 길을 남기는지만 본다.
// 자기 쿼리를 직접 쓰는 자식들은 네트워크를 타므로 비운다.
vi.mock('./MissionQuickCard', () => ({ MissionQuickCard: () => null }));
vi.mock('./PatternInsightsCard', () => ({ PatternInsightsCard: () => null }));
vi.mock('./NeighborSection', () => ({ NeighborSection: () => null }));
vi.mock('./DelayAlertBanner', () => ({ DelayAlertBanner: () => null }));
vi.mock('./BriefingSection', () => ({ BriefingSection: () => null }));

let mockHomeData: UseHomeDataReturn;

vi.mock('./use-home-data', () => ({
  useHomeData: () => mockHomeData,
}));

const STREAK: StreakResponse = {
  userId: 'u-1',
  currentStreak: 5,
  bestStreak: 9,
  lastRecordDate: '2026-09-11',
  streakStartDate: '2026-09-07',
  weeklyGoal: 5,
  weeklyCount: 3,
  weekStartDate: '2026-09-07',
  milestonesAchieved: [],
  latestMilestone: null,
  nextMilestone: null,
  streakStatus: 'active',
  excludeWeekends: true,
  reminderEnabled: true,
  todayRecorded: true,
};

function baseHomeData(): UseHomeDataReturn {
  return {
    isLoggedIn: true,
    userId: 'u-1',
    userName: '테스터',
    isLoading: false,
    loadError: '',
    weather: null,
    weatherError: '',
    airQualityError: '',
    airQuality: { label: '보통', className: '' },
    airQualityData: null,
    weatherLoading: false,
    checklistItems: [],
    checkedItems: new Set<string>(),
    handleChecklistToggle: vi.fn(),
    departurePrediction: null,
    routeRecommendation: null,
    routeRecDismissed: false,
    dismissRouteRecommendation: vi.fn(),
    routes: [],
    activeRoute: null,
    forceRouteType: 'auto',
    setForceRouteType: vi.fn(),
    transitInfos: [],
    isTransitRefreshing: false,
    lastTransitUpdate: null,
    alerts: [],
    nextAlert: null,
    commuteStats: null,
    streak: STREAK,
    streakError: '',
    weeklyReport: null,
    weeklyReportLoading: false,
    weeklyReportError: '',
    weekOffset: 0,
    setWeekOffset: vi.fn(),
    isDefaultLocation: false,
    isCommuteStarting: false,
    handleStartCommute: vi.fn(),
    retryLoad: vi.fn(),
    navigate: vi.fn() as unknown as UseHomeDataReturn['navigate'],
  };
}

function renderHome() {
  return render(
    <TestProviders>
      <HomePage />
    </TestProviders>,
  );
}

beforeEach(() => {
  mockHomeData = baseHomeData();
});

describe('HomePage — 보조 위젯 조회 실패에 다음 행동을 남긴다', () => {
  it('주간 리포트 조회가 실패하면 다시 시도 버튼을 준다', async () => {
    mockHomeData.weeklyReport = null;
    mockHomeData.weeklyReportError = '주간 리포트를 불러올 수 없습니다';
    renderHome();

    expect(screen.getByText('주간 리포트를 불러올 수 없습니다')).toBeInTheDocument();

    const retry = screen.getByRole('button', { name: '다시 시도' });
    await userEvent.click(retry);
    expect(mockHomeData.retryLoad).toHaveBeenCalled();
  });

  it('스트릭 조회가 실패하면 실패를 알리고 다시 시도 버튼을 준다', async () => {
    mockHomeData.streak = null;
    mockHomeData.streakError = '스트릭 정보를 불러올 수 없습니다';
    renderHome();

    expect(screen.getByText('스트릭 정보를 불러올 수 없습니다')).toBeInTheDocument();

    const retry = screen.getByRole('button', { name: '다시 시도' });
    await userEvent.click(retry);
    expect(mockHomeData.retryLoad).toHaveBeenCalled();
  });

  // 대조군 — 정상일 때 에러 UI가 끼어들지 않는다.
  it('스트릭이 정상이면 에러 없이 배지를 그린다', () => {
    renderHome();

    expect(screen.getByLabelText('연속 5일 스트릭')).toBeInTheDocument();
    expect(screen.queryByText('스트릭 정보를 불러올 수 없습니다')).not.toBeInTheDocument();
  });

  // 대조군 — 스트릭이 아직 없는 신규 사용자(실패 아님)를 에러로 만들지 않는다.
  it('스트릭이 없고 에러도 없으면 아무것도 그리지 않는다', () => {
    mockHomeData.streak = null;
    renderHome();

    expect(screen.queryByText('스트릭 정보를 불러올 수 없습니다')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '다시 시도' })).not.toBeInTheDocument();
  });
});
