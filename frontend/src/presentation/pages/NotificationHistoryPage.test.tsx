import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { NotificationHistoryPage } from './NotificationHistoryPage';
import { notificationApiClient } from '@infrastructure/api';

const mockNotificationApiClient = notificationApiClient as unknown as {
  getHistory: jest.Mock;
};

function renderPage() {
  return render(
    <MemoryRouter>
      <NotificationHistoryPage />
    </MemoryRouter>
  );
}

describe('NotificationHistoryPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.setItem('userId', 'test-user');
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should show login message when not logged in', () => {
    localStorage.clear();
    renderPage();
    expect(screen.getByText('로그인이 필요해요')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /로그인/ })).toBeInTheDocument();
  });

  it('should show empty state when no logs', async () => {
    mockNotificationApiClient.getHistory.mockResolvedValue({ items: [], total: 0 });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('알림 기록이 없어요')).toBeInTheDocument();
    });
  });

  it('should render notification logs', async () => {
    const mockLogs = [
      {
        id: '1',
        alertId: 'a1',
        alertName: '아침 날씨 알림',
        alertTypes: ['weather'],
        status: 'success',
        summary: '맑음 15도',
        sentAt: new Date().toISOString(),
      },
      {
        id: '2',
        alertId: 'a2',
        alertName: '퇴근 교통 알림',
        alertTypes: ['subway', 'bus'],
        status: 'failed',
        summary: '',
        sentAt: new Date(Date.now() - 86400000).toISOString(),
      },
    ];

    mockNotificationApiClient.getHistory.mockResolvedValue({
      items: mockLogs,
      total: 2,
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('아침 날씨 알림')).toBeInTheDocument();
      expect(screen.getByText('퇴근 교통 알림')).toBeInTheDocument();
    });

    expect(screen.getByText('발송 완료')).toBeInTheDocument();
    expect(screen.getByText('발송 실패')).toBeInTheDocument();
    expect(screen.getByText('맑음 15도')).toBeInTheDocument();
  });

  it('should show load more button when there are more items', async () => {
    const items = Array.from({ length: 5 }, (_, i) => ({
      id: String(i),
      alertId: `a${i}`,
      alertName: `알림 ${i}`,
      alertTypes: ['weather'],
      status: 'success',
      summary: '',
      sentAt: new Date().toISOString(),
    }));

    mockNotificationApiClient.getHistory.mockResolvedValue({
      items,
      total: 10,
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('더 보기')).toBeInTheDocument();
    });
  });

  it('should call getHistory with offset when load more is clicked', async () => {
    const items = Array.from({ length: 5 }, (_, i) => ({
      id: String(i),
      alertId: `a${i}`,
      alertName: `알림 ${i}`,
      alertTypes: ['weather'],
      status: 'success',
      summary: '',
      sentAt: new Date().toISOString(),
    }));

    mockNotificationApiClient.getHistory
      .mockResolvedValueOnce({ items, total: 10 })
      .mockResolvedValueOnce({ items: [], total: 10 });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('더 보기')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText('더 보기'));

    expect(mockNotificationApiClient.getHistory).toHaveBeenCalledWith(20, 5);
  });

  it('should show error message on API failure', async () => {
    mockNotificationApiClient.getHistory.mockRejectedValue(new Error('API error'));

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('알림 기록을 불러올 수 없습니다.')).toBeInTheDocument();
    });
  });

  it('should display total count in header', async () => {
    mockNotificationApiClient.getHistory.mockResolvedValue({
      items: [{
        id: '1',
        alertId: 'a1',
        alertName: '알림',
        alertTypes: ['weather'],
        status: 'success',
        summary: '',
        sentAt: new Date().toISOString(),
      }],
      total: 42,
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('42건')).toBeInTheDocument();
    });
  });
});
