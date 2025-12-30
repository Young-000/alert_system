import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AlertSettingsPage } from './AlertSettingsPage';
import { AlertApiClient } from '@infrastructure/api/alert-api.client';
import { ApiClient } from '@infrastructure/api/api-client';

jest.mock('@infrastructure/api/alert-api.client');
jest.mock('@infrastructure/api/api-client');

describe('AlertSettingsPage', () => {
  let mockAlertApiClient: jest.Mocked<AlertApiClient>;

  beforeEach(() => {
    mockAlertApiClient = {
      createAlert: jest.fn(),
      getAlertsByUser: jest.fn(),
      getAlert: jest.fn(),
      deleteAlert: jest.fn(),
    } as any;
    (AlertApiClient as jest.Mock).mockImplementation(() => mockAlertApiClient);
    localStorage.setItem('userId', 'user-1');
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should render alert form', () => {
    mockAlertApiClient.getAlertsByUser.mockResolvedValue([]);
    render(<AlertSettingsPage />);
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
  });

  it('should load existing alerts', async () => {
    const mockAlerts = [
      {
        id: 'alert-1',
        userId: 'user-1',
        name: '출근 알림',
        schedule: '0 8 * * *',
        alertTypes: ['weather'],
        enabled: true,
      },
    ];
    mockAlertApiClient.getAlertsByUser.mockResolvedValue(mockAlerts);

    render(<AlertSettingsPage />);

    await waitFor(() => {
      expect(screen.getByText('출근 알림')).toBeInTheDocument();
    });
  });

  it('should create new alert', async () => {
    mockAlertApiClient.getAlertsByUser.mockResolvedValue([]);
    mockAlertApiClient.createAlert.mockResolvedValue({
      id: 'alert-1',
      userId: 'user-1',
      name: '출근 알림',
      schedule: '0 8 * * *',
      alertTypes: ['weather'],
      enabled: true,
    });

    render(<AlertSettingsPage />);

    fireEvent.change(screen.getByLabelText(/name/i), {
      target: { value: '출근 알림' },
    });
    fireEvent.click(screen.getByRole('button', { name: /create/i }));

    await waitFor(() => {
      expect(mockAlertApiClient.createAlert).toHaveBeenCalled();
    });
  });
});

