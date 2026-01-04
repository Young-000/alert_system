import { PushNotificationService } from './push-notification.service';

jest.mock('web-push', () => {
  const mockSetVapidDetails = jest.fn();
  const mockSendNotification = jest.fn();
  const api = {
    setVapidDetails: mockSetVapidDetails,
    sendNotification: mockSendNotification,
  };
  return {
    ...api,
    default: api,
    __mockSetVapidDetails: mockSetVapidDetails,
    __mockSendNotification: mockSendNotification,
  };
});

describe('PushNotificationService', () => {
  let service: PushNotificationService;
  let mockSendNotification: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    const webpushMock = jest.requireMock('web-push') as any;
    mockSendNotification = webpushMock.__mockSendNotification;
    service = new PushNotificationService('public-key', 'private-key', 'mailto:test@example.com');
  });

  it('should send push notification', async () => {
    const subscription = {
      endpoint: 'https://example.com/push',
      keys: {
        p256dh: 'key1',
        auth: 'key2',
      },
    };
    const payload = JSON.stringify({ title: 'Test', body: 'Test message' });
    mockSendNotification.mockResolvedValue({});

    await service.sendNotification(subscription, payload);

    expect(mockSendNotification).toHaveBeenCalledWith(subscription, payload);
  });

  it('should handle push notification errors', async () => {
    const subscription = {
      endpoint: 'https://example.com/push',
      keys: {
        p256dh: 'key1',
        auth: 'key2',
      },
    };
    const payload = JSON.stringify({ title: 'Test', body: 'Test message' });
    mockSendNotification.mockRejectedValue(new Error('Push error'));

    await expect(service.sendNotification(subscription, payload)).rejects.toThrow('Push error');
  });
});
