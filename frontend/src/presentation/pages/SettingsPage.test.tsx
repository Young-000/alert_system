import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SettingsPage } from './SettingsPage';
import { alertApiClient, commuteApiClient, getCommuteApiClient } from '@infrastructure/api';
import type { Alert, AlertType } from '@infrastructure/api';

jest.mock('@infrastructure/api');

jest.mock('@infrastructure/push/push-manager', () => ({
  isPushSupported: jest.fn().mockResolvedValue(false),
  isPushSubscribed: jest.fn().mockResolvedValue(false),
  subscribeToPush: jest.fn(),
  unsubscribeFromPush: jest.fn(),
}));

jest.mock('@presentation/hooks/useAuth', () => ({
  useAuth: () => {
    const userId = localStorage.getItem('userId') || '';
    const phoneNumber = localStorage.getItem('phoneNumber') || '';
    const userName = localStorage.getItem('userName') || '회원';
    const userEmail = localStorage.getItem('userEmail') || '';
    return { userId, phoneNumber, userName, userEmail, isLoggedIn: !!userId };
  },
  notifyAuthChange: jest.fn(),
}));

const mockAlertApiClient = alertApiClient as jest.Mocked<typeof alertApiClient>;
const mockCommuteApiClient = commuteApiClient as jest.Mocked<typeof commuteApiClient>;
const mockGetCommuteApiClient = getCommuteApiClient as jest.MockedFunction<typeof getCommuteApiClient>;

function renderSettingsPage(): ReturnType<typeof render> {
  return render(
    <MemoryRouter>
      <SettingsPage />
    </MemoryRouter>
  );
}

describe('SettingsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    mockGetCommuteApiClient.mockReturnValue(mockCommuteApiClient);
    mockAlertApiClient.getAlertsByUser.mockResolvedValue([]);
    mockCommuteApiClient.getUserRoutes.mockResolvedValue([]);
  });

  afterEach(() => {
    localStorage.clear();
  });

  // 1. Shows login prompt when not logged in
  it('should show login prompt when userId is not in localStorage', () => {
    renderSettingsPage();

    expect(screen.getByText('로그인이 필요해요')).toBeInTheDocument();
    expect(screen.getByText('로그인')).toBeInTheDocument();
  });

  // 2. Renders tabs when logged in
  it('should render 4 tabs when user is logged in', async () => {
    localStorage.setItem('userId', 'test-user-123');
    localStorage.setItem('phoneNumber', '010-1234-5678');

    renderSettingsPage();

    await waitFor(() => {
      expect(screen.queryByText('불러오는 중...')).not.toBeInTheDocument();
    });

    expect(screen.getByText('프로필')).toBeInTheDocument();
    expect(screen.getByText('경로')).toBeInTheDocument();
    expect(screen.getByText('알림')).toBeInTheDocument();
    expect(screen.getByText('앱')).toBeInTheDocument();
  });

  // 3. Shows profile info (phone number) in profile tab
  it('should display phone number in profile tab', async () => {
    localStorage.setItem('userId', 'test-user-123');
    localStorage.setItem('phoneNumber', '010-1234-5678');

    renderSettingsPage();

    await waitFor(() => {
      expect(screen.queryByText('불러오는 중...')).not.toBeInTheDocument();
    });

    expect(screen.getByText('전화번호')).toBeInTheDocument();
    expect(screen.getByText('010-1234-5678')).toBeInTheDocument();
    expect(screen.getByText('사용자 ID')).toBeInTheDocument();
    expect(screen.getByText('로그아웃')).toBeInTheDocument();
  });

  // 4. Switching tabs works
  it('should switch tabs when clicking tab buttons', async () => {
    localStorage.setItem('userId', 'test-user-123');
    localStorage.setItem('phoneNumber', '010-1234-5678');

    renderSettingsPage();

    await waitFor(() => {
      expect(screen.queryByText('불러오는 중...')).not.toBeInTheDocument();
    });

    // Initially on profile tab
    expect(screen.getByText('전화번호')).toBeInTheDocument();

    // Switch to routes tab
    fireEvent.click(screen.getByText('경로'));
    expect(screen.getByText('내 경로')).toBeInTheDocument();

    // Switch to alerts tab
    fireEvent.click(screen.getByText('알림'));
    expect(screen.getByText('내 알림')).toBeInTheDocument();

    // Switch to app tab
    fireEvent.click(screen.getByText('앱'));
    expect(screen.getByText('앱 설정')).toBeInTheDocument();
    expect(screen.getByText('버전')).toBeInTheDocument();

    // Switch back to profile tab
    fireEvent.click(screen.getByText('프로필'));
    expect(screen.getByText('전화번호')).toBeInTheDocument();
  });

  // 5. Shows empty state for routes when no routes
  it('should show empty state when no routes exist', async () => {
    localStorage.setItem('userId', 'test-user-123');
    mockCommuteApiClient.getUserRoutes.mockResolvedValue([]);

    renderSettingsPage();

    await waitFor(() => {
      expect(screen.queryByText('불러오는 중...')).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('경로'));

    expect(screen.getByText('등록된 경로가 없어요')).toBeInTheDocument();
    expect(screen.getByText('경로 추가하기')).toBeInTheDocument();
  });

  // 6. Shows empty state for alerts when no alerts
  it('should show empty state when no alerts exist', async () => {
    localStorage.setItem('userId', 'test-user-123');
    mockAlertApiClient.getAlertsByUser.mockResolvedValue([]);

    renderSettingsPage();

    await waitFor(() => {
      expect(screen.queryByText('불러오는 중...')).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('알림'));

    expect(screen.getByText('설정된 알림이 없어요')).toBeInTheDocument();
    expect(screen.getByText('알림 설정하기')).toBeInTheDocument();
  });

  // 7. Loading state displays correctly
  it('should display loading state while fetching data', () => {
    localStorage.setItem('userId', 'test-user-123');

    // Keep promises pending to maintain loading state
    mockAlertApiClient.getAlertsByUser.mockReturnValue(new Promise(() => {}));
    mockCommuteApiClient.getUserRoutes.mockReturnValue(new Promise(() => {}));

    renderSettingsPage();

    expect(screen.getByText('불러오는 중...')).toBeInTheDocument();
  });

  // Additional: shows routes list when routes exist
  it('should display routes list when routes are loaded', async () => {
    localStorage.setItem('userId', 'test-user-123');

    mockCommuteApiClient.getUserRoutes.mockResolvedValue([
      {
        id: 'route-1',
        userId: 'test-user-123',
        name: '강남 출근길',
        routeType: 'morning' as const,
        isPreferred: true,
        totalExpectedDuration: 60,
        totalTransferTime: 10,
        pureMovementTime: 50,
        checkpoints: [
          {
            id: 'cp-1',
            sequenceOrder: 1,
            name: '집',
            checkpointType: 'home' as const,
            expectedWaitTime: 0,
            totalExpectedTime: 0,
            isTransferRelated: false,
          },
          {
            id: 'cp-2',
            sequenceOrder: 2,
            name: '강남역',
            checkpointType: 'subway' as const,
            expectedWaitTime: 5,
            totalExpectedTime: 30,
            isTransferRelated: false,
          },
        ],
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
    ]);

    renderSettingsPage();

    await waitFor(() => {
      expect(screen.queryByText('불러오는 중...')).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('경로'));

    expect(screen.getByText('강남 출근길')).toBeInTheDocument();
    expect(screen.getByText('출근')).toBeInTheDocument();
    expect(screen.getByText('집 → 강남역')).toBeInTheDocument();
  });

  // Additional: shows alerts list with toggle switches
  it('should display alerts list with toggle switches when alerts are loaded', async () => {
    localStorage.setItem('userId', 'test-user-123');

    const mockAlerts: Alert[] = [
      {
        id: 'alert-1',
        userId: 'test-user-123',
        name: '출근 날씨 알림',
        schedule: '0 7 * * *',
        alertTypes: ['weather', 'airQuality'] as AlertType[],
        enabled: true,
      },
      {
        id: 'alert-2',
        userId: 'test-user-123',
        name: '퇴근 교통 알림',
        schedule: '0 18 * * *',
        alertTypes: ['subway'] as AlertType[],
        enabled: false,
      },
    ];
    mockAlertApiClient.getAlertsByUser.mockResolvedValue(mockAlerts);

    renderSettingsPage();

    await waitFor(() => {
      expect(screen.queryByText('불러오는 중...')).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('알림'));

    expect(screen.getByText('출근 날씨 알림')).toBeInTheDocument();
    expect(screen.getByText('퇴근 교통 알림')).toBeInTheDocument();
    expect(screen.getByText('날씨')).toBeInTheDocument();
    expect(screen.getByText('미세먼지')).toBeInTheDocument();
    expect(screen.getByText('지하철')).toBeInTheDocument();

    // Check toggle switches exist
    const toggles = screen.getAllByRole('checkbox');
    expect(toggles).toHaveLength(2);
    expect(toggles[0]).toBeChecked();
    expect(toggles[1]).not.toBeChecked();
  });

  // Additional: app tab shows version and local data reset
  it('should display app info in app tab', async () => {
    localStorage.setItem('userId', 'test-user-123');

    renderSettingsPage();

    await waitFor(() => {
      expect(screen.queryByText('불러오는 중...')).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('앱'));

    expect(screen.getByText('버전')).toBeInTheDocument();
    expect(screen.getByText('1.0.0')).toBeInTheDocument();
    expect(screen.getByText('로컬 데이터')).toBeInTheDocument();
    expect(screen.getByText('초기화')).toBeInTheDocument();
    expect(screen.getByText('알림 발송 기록')).toBeInTheDocument();
  });

  // Additional: phone number shows '미등록' when not set
  it('should display "미등록" when phone number is not set', async () => {
    localStorage.setItem('userId', 'test-user-123');
    // No phoneNumber set

    renderSettingsPage();

    await waitFor(() => {
      expect(screen.queryByText('불러오는 중...')).not.toBeInTheDocument();
    });

    expect(screen.getByText('미등록')).toBeInTheDocument();
  });
});
