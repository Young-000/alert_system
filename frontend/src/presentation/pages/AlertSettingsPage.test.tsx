import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AlertSettingsPage } from './AlertSettingsPage';
import { alertApiClient } from '@infrastructure/api';
import type { AlertType } from '@infrastructure/api';

jest.mock('../hooks/usePushNotification', () => ({
  usePushNotification: () => ({
    permission: 'default',
    subscription: null,
    isSwReady: true,
    swError: null,
    requestPermission: jest.fn().mockResolvedValue('granted'),
    subscribe: jest.fn().mockResolvedValue({ endpoint: 'test', keys: {} }),
    unsubscribe: jest.fn(),
  }),
}));

const mockAlertApiClient = alertApiClient as jest.Mocked<typeof alertApiClient>;

describe('AlertSettingsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
      expect(screen.getByText('출근 알림')).toBeInTheDocument();
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

  it('should show login warning when userId is not set', async () => {
    localStorage.clear();
    mockAlertApiClient.getAlertsByUser.mockResolvedValue([]);

    render(
      <MemoryRouter>
        <AlertSettingsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('먼저 계정을 만들어주세요.')).toBeInTheDocument();
    });
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
      expect(screen.getByText('테스트 알림')).toBeInTheDocument();
    });

    const deleteButton = screen.getByText('삭제');
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(mockAlertApiClient.deleteAlert).toHaveBeenCalledWith('alert-1');
    });
  });
});
