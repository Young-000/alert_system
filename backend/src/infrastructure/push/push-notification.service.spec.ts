import { PushNotificationService } from './push-notification.service';

const mockSetVapidDetails = jest.fn();
const mockSendNotification = jest.fn();

jest.mock('web-push', () => ({
  setVapidDetails: mockSetVapidDetails,
  sendNotification: mockSendNotification,
}));

describe('PushNotificationService', () => {
  let service: PushNotificationService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PushNotificationService('public-key', 'private-key');
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

