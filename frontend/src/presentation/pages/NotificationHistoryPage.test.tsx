import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { NotificationHistoryPage } from './NotificationHistoryPage';
import { notificationApiClient } from '@infrastructure/api';

const mockNotificationApiClient = notificationApiClient as jest.Mocked<typeof notificationApiClient>;

function renderPage(): ReturnType<typeof render> {
  return render(
    <MemoryRouter>
      <NotificationHistoryPage />
    </MemoryRouter>
  );
}

describe('NotificationHistoryPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.setItem('userId', 'user-1');
    mockNotificationApiClient.getHistory.mockResolvedValue({ items: [], total: 0 });
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should show login prompt when not logged in', () => {
    localStorage.clear();

    renderPage();

    expect(screen.getByText('로그인이 필요해요')).toBeInTheDocument();
    expect(screen.getByText('알림 기록을 보려면 로그인하세요')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '로그인 페이지로 이동' })).toHaveAttribute('href', '/login');
  });

  it('should show loading state initially', () => {
    mockNotificationApiClient.getHistory.mockReturnValue(new Promise(() => {}));

    renderPage();

    expect(screen.getByText('불러오는 중...')).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('should show empty state when no notifications', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('알림 기록이 없어요')).toBeInTheDocument();
    });

    expect(screen.getByText('알림이 발송되면 여기에 기록됩니다')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '알림 설정 페이지로 이동' })).toHaveAttribute('href', '/alerts');
  });

  it('should render notification items correctly', async () => {
    const mockLogs = [
      {
        id: '1',
        alertId: 'alert-1',
        alertName: '출근 알림',
        alertTypes: ['weather', 'subway'],
        status: 'success',
        summary: '맑음, 2호선 정상운행',
        sentAt: new Date().toISOString(),
      },
    ];
    mockNotificationApiClient.getHistory.mockResolvedValue({ items: mockLogs, total: 1 });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('출근 알림')).toBeInTheDocument();
    });

    expect(screen.getByText('발송 완료')).toBeInTheDocument();
    expect(screen.getByText('맑음, 2호선 정상운행')).toBeInTheDocument();

    // Type badges appear inside the notification item alongside filter buttons
    const typeBadges = screen.getAllByText('날씨');
    expect(typeBadges.length).toBeGreaterThanOrEqual(1);
    const subwayBadges = screen.getAllByText('지하철');
    expect(subwayBadges.length).toBeGreaterThanOrEqual(1);
  });

  it('should show filter buttons when logs exist', async () => {
    const mockLogs = [
      {
        id: '1',
        alertId: 'alert-1',
        alertName: '출근 알림',
        alertTypes: ['weather'],
        status: 'success',
        summary: '맑음',
        sentAt: new Date().toISOString(),
      },
    ];
    mockNotificationApiClient.getHistory.mockResolvedValue({ items: mockLogs, total: 1 });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('출근 알림')).toBeInTheDocument();
    });

    // Type filter buttons
    expect(screen.getByRole('group', { name: '알림 유형 필터' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: '기간 필터' })).toBeInTheDocument();

    // Type filter options (전체 appears in both type and period filters)
    const allButtons = screen.getAllByText('전체');
    expect(allButtons.length).toBe(2);
    expect(screen.getByText('미세먼지')).toBeInTheDocument();
    expect(screen.getByText('버스')).toBeInTheDocument();

    // Period filter options
    expect(screen.getByText('최근 7일')).toBeInTheDocument();
    expect(screen.getByText('최근 30일')).toBeInTheDocument();
  });

  it('should filter by type when type filter button is clicked', async () => {
    const mockLogs = [
      {
        id: '1',
        alertId: 'alert-1',
        alertName: '날씨 알림',
        alertTypes: ['weather'],
        status: 'success',
        summary: '맑음',
        sentAt: new Date().toISOString(),
      },
      {
        id: '2',
        alertId: 'alert-2',
        alertName: '지하철 알림',
        alertTypes: ['subway'],
        status: 'success',
        summary: '2호선 정상운행',
        sentAt: new Date().toISOString(),
      },
    ];
    mockNotificationApiClient.getHistory.mockResolvedValue({ items: mockLogs, total: 2 });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('날씨 알림')).toBeInTheDocument();
      expect(screen.getByText('지하철 알림')).toBeInTheDocument();
    });

    // Click the subway type filter (the one in the type filter group, not the badge)
    const typeFilterGroup = screen.getByRole('group', { name: '알림 유형 필터' });
    const subwayFilterButton = typeFilterGroup.querySelector('button:nth-child(4)') as HTMLButtonElement;
    fireEvent.click(subwayFilterButton);

    // Only subway notification should be visible
    expect(screen.getByText('지하철 알림')).toBeInTheDocument();
    expect(screen.queryByText('날씨 알림')).not.toBeInTheDocument();
  });

  it('should show "더 보기" button when more items are available', async () => {
    const mockLogs = [
      {
        id: '1',
        alertId: 'alert-1',
        alertName: '출근 알림',
        alertTypes: ['weather'],
        status: 'success',
        summary: '맑음',
        sentAt: new Date().toISOString(),
      },
    ];
    mockNotificationApiClient.getHistory.mockResolvedValue({ items: mockLogs, total: 5 });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('출근 알림')).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: '알림 기록 더 보기' })).toBeInTheDocument();
    expect(screen.getByText('더 보기')).toBeInTheDocument();
  });

  it('should not show "더 보기" button when all items are loaded', async () => {
    const mockLogs = [
      {
        id: '1',
        alertId: 'alert-1',
        alertName: '출근 알림',
        alertTypes: ['weather'],
        status: 'success',
        summary: '맑음',
        sentAt: new Date().toISOString(),
      },
    ];
    mockNotificationApiClient.getHistory.mockResolvedValue({ items: mockLogs, total: 1 });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('출근 알림')).toBeInTheDocument();
    });

    expect(screen.queryByText('더 보기')).not.toBeInTheDocument();
  });

  it('should load more items when "더 보기" button is clicked', async () => {
    const firstBatch = [
      {
        id: '1',
        alertId: 'alert-1',
        alertName: '첫번째 알림',
        alertTypes: ['weather'],
        status: 'success',
        summary: '맑음',
        sentAt: new Date().toISOString(),
      },
    ];
    const secondBatch = [
      {
        id: '2',
        alertId: 'alert-2',
        alertName: '두번째 알림',
        alertTypes: ['subway'],
        status: 'success',
        summary: '정상운행',
        sentAt: new Date().toISOString(),
      },
    ];

    mockNotificationApiClient.getHistory
      .mockResolvedValueOnce({ items: firstBatch, total: 2 })
      .mockResolvedValueOnce({ items: secondBatch, total: 2 });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('첫번째 알림')).toBeInTheDocument();
    });

    const loadMoreButton = screen.getByRole('button', { name: '알림 기록 더 보기' });
    fireEvent.click(loadMoreButton);

    await waitFor(() => {
      expect(screen.getByText('두번째 알림')).toBeInTheDocument();
    });

    expect(screen.getByText('첫번째 알림')).toBeInTheDocument();
    expect(mockNotificationApiClient.getHistory).toHaveBeenCalledTimes(2);
    expect(mockNotificationApiClient.getHistory).toHaveBeenLastCalledWith(20, 1);
  });
});
