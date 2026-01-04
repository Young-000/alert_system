import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AlertSettingsPage } from './AlertSettingsPage';
import { AlertApiClient } from '@infrastructure/api/alert-api.client';
import type { AlertType } from '@infrastructure/api/alert-api.client';
import { UserApiClient } from '@infrastructure/api/user-api.client';
import { SubwayApiClient } from '@infrastructure/api/subway-api.client';

jest.mock('@infrastructure/api/alert-api.client');
jest.mock('@infrastructure/api/api-client');
jest.mock('@infrastructure/api/user-api.client');
jest.mock('@infrastructure/api/subway-api.client');
jest.mock('../hooks/usePushNotification', () => ({
  usePushNotification: () => ({
    permission: 'default',
    subscription: null,
    requestPermission: jest.fn(),
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
  }),
}));

describe('AlertSettingsPage', () => {
  let mockAlertApiClient: jest.Mocked<AlertApiClient>;
  let mockUserApiClient: jest.Mocked<UserApiClient>;
  let mockSubwayApiClient: jest.Mocked<SubwayApiClient>;

  beforeEach(() => {
    mockAlertApiClient = {
      createAlert: jest.fn(),
      getAlertsByUser: jest.fn(),
      getAlert: jest.fn(),
      deleteAlert: jest.fn(),
    } as any;
    (AlertApiClient as jest.Mock).mockImplementation(() => mockAlertApiClient);
    mockUserApiClient = {
      createUser: jest.fn(),
      getUser: jest.fn(),
      updateLocation: jest.fn(),
    } as any;
    (UserApiClient as jest.Mock).mockImplementation(() => mockUserApiClient);
    mockSubwayApiClient = {
      searchStations: jest.fn(),
    } as any;
    (SubwayApiClient as jest.Mock).mockImplementation(() => mockSubwayApiClient);
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

    fireEvent.change(screen.getByLabelText(/name/i), {
      target: { value: '출근 알림' },
    });
    fireEvent.click(screen.getByRole('button', { name: /알림 시작하기/i }));

    await waitFor(() => {
      expect(mockAlertApiClient.createAlert).toHaveBeenCalled();
    });
  });
});
