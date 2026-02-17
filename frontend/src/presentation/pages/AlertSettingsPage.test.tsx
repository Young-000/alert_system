import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AlertSettingsPage } from './AlertSettingsPage';
import { alertApiClient } from '@infrastructure/api';
import type { AlertType } from '@infrastructure/api';
import type { Mocked } from 'vitest';

const mockAlertApiClient = alertApiClient as Mocked<typeof alertApiClient>;

describe('AlertSettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('userId', 'user-1');
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should render wizard first step with type selection', async () => {
    mockAlertApiClient.getAlertsByUser.mockResolvedValue([]);

    render(
      <MemoryRouter>
        <AlertSettingsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('어떤 정보를 받고 싶으세요?')).toBeInTheDocument();
    });

    expect(screen.getByText('날씨')).toBeInTheDocument();
    expect(screen.getByText('교통')).toBeInTheDocument();
  });

  it('should load existing alerts', async () => {
    const mockAlerts = [
      {
        id: 'alert-1',
        userId: 'user-1',
        name: '출근 알림',
        schedule: '0 8 * * *',
        alertTypes: ['weather'] as AlertType[],
        enabled: true,
      },
    ];
    mockAlertApiClient.getAlertsByUser.mockResolvedValue(mockAlerts);

    render(
      <MemoryRouter>
        <AlertSettingsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      const elements = screen.getAllByText('출근 알림');
      expect(elements.length).toBeGreaterThan(0);
    });
  });

  it('should navigate through wizard steps when weather is selected', async () => {
    mockAlertApiClient.getAlertsByUser.mockResolvedValue([]);

    render(
      <MemoryRouter>
        <AlertSettingsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('어떤 정보를 받고 싶으세요?')).toBeInTheDocument();
    });

    // Select weather
    const weatherButton = screen.getByText('날씨').closest('button');
    fireEvent.click(weatherButton!);

    // Click next
    const nextButton = screen.getByText('다음 →');
    fireEvent.click(nextButton);

    // Should go to routine step (skipping transport steps)
    await waitFor(() => {
      expect(screen.getByText('하루 루틴을 알려주세요')).toBeInTheDocument();
    });
  });

  it('should show login empty state when userId is not set', async () => {
    localStorage.clear();
    mockAlertApiClient.getAlertsByUser.mockResolvedValue([]);

    render(
      <MemoryRouter>
        <AlertSettingsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('로그인이 필요해요')).toBeInTheDocument();
    });
    expect(screen.getByText('알림을 설정하려면 먼저 로그인하세요')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '로그인' })).toHaveAttribute('href', '/login');
  });

  it('should delete an alert', async () => {
    const mockAlerts = [
      {
        id: 'alert-1',
        userId: 'user-1',
        name: '테스트 알림',
        schedule: '0 8 * * *',
        alertTypes: ['weather'] as AlertType[],
        enabled: true,
      },
    ];
    mockAlertApiClient.getAlertsByUser.mockResolvedValue(mockAlerts);
    mockAlertApiClient.deleteAlert.mockResolvedValue(undefined);

    render(
      <MemoryRouter>
        <AlertSettingsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      const elements = screen.getAllByText('테스트 알림');
      expect(elements.length).toBeGreaterThan(0);
    });

    // 삭제 버튼 클릭 -> 모달 열림
    const deleteButton = screen.getByLabelText('삭제');
    fireEvent.click(deleteButton);

    // 모달의 삭제 확인 버튼 클릭
    await waitFor(() => {
      expect(screen.getByText('알림 삭제')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByRole('button', { name: '삭제' });
    const confirmButton = deleteButtons.find(btn => btn.classList.contains('btn-danger'));
    fireEvent.click(confirmButton!);

    await waitFor(() => {
      expect(mockAlertApiClient.deleteAlert).toHaveBeenCalledWith('alert-1');
    });
  });
});
