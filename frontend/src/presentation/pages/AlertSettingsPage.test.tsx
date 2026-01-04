import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AlertSettingsPage } from './AlertSettingsPage';
import { alertApiClient, userApiClient } from '@infrastructure/api';
import type { AlertType } from '@infrastructure/api';

jest.mock('../hooks/usePushNotification', () => ({
  usePushNotification: () => ({
    permission: 'default',
    subscription: null,
    isSwReady: true,
    swError: null,
    requestPermission: jest.fn(),
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
  }),
}));

const mockAlertApiClient = alertApiClient as jest.Mocked<typeof alertApiClient>;
const mockUserApiClient = userApiClient as jest.Mocked<typeof userApiClient>;

describe('AlertSettingsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.setItem('userId', 'user-1');
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should render alert form', () => {
    mockAlertApiClient.getAlertsByUser.mockResolvedValue([]);
    mockUserApiClient.getUser.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      name: 'John Doe',
    });
    render(
      <MemoryRouter>
        <AlertSettingsPage />
      </MemoryRouter>
    );
    return waitFor(() => {
      expect(mockAlertApiClient.getAlertsByUser).toHaveBeenCalled();
      expect(mockUserApiClient.getUser).toHaveBeenCalled();
      expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/schedule/i)).toBeInTheDocument();
    });
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
    mockUserApiClient.getUser.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      name: 'John Doe',
    });

    render(
      <MemoryRouter>
        <AlertSettingsPage />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByText('출근 알림')).toBeInTheDocument();
    });
  });

  it('should create new alert', async () => {
    mockAlertApiClient.getAlertsByUser.mockResolvedValue([]);
    mockUserApiClient.getUser.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      name: 'John Doe',
    });
    mockAlertApiClient.createAlert.mockResolvedValue({
      id: 'alert-1',
      userId: 'user-1',
      name: '출근 알림',
      schedule: '0 8 * * *',
      alertTypes: ['weather'] as AlertType[],
      enabled: true,
    });

    render(
      <MemoryRouter>
        <AlertSettingsPage />
      </MemoryRouter>
    );

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/name/i), {
      target: { value: '출근 알림' },
    });

    // Select at least one alert type (weather)
    const weatherCheckbox = screen.getByRole('checkbox', { name: /weather/i });
    fireEvent.click(weatherCheckbox);

    fireEvent.click(screen.getByRole('button', { name: /알림 시작하기/i }));

    await waitFor(() => {
      expect(mockAlertApiClient.createAlert).toHaveBeenCalled();
    });
  });
});
