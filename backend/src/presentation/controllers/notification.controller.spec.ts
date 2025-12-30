import { NotificationController } from './notification.controller';
import { IPushSubscriptionRepository } from '@domain/repositories/push-subscription.repository';
import { PushSubscription } from '@infrastructure/push/push-notification.service';

describe('NotificationController', () => {
  let controller: NotificationController;
  let pushSubscriptionRepository: jest.Mocked<IPushSubscriptionRepository>;

  beforeEach(() => {
    pushSubscriptionRepository = {
      save: jest.fn(),
      findByUserId: jest.fn(),
      delete: jest.fn(),
    };

    // VAPID_PUBLIC_KEY 환경 변수 설정
    process.env.VAPID_PUBLIC_KEY = 'test-public-key';

    controller = new NotificationController(pushSubscriptionRepository);
  });

  afterEach(() => {
    delete process.env.VAPID_PUBLIC_KEY;
  });

  it('should return VAPID public key', () => {
    const result = controller.getVapidPublicKey();
    expect(result).toEqual({ publicKey: 'test-public-key' });
  });

  it('should return empty string if VAPID_PUBLIC_KEY not set', () => {
    delete process.env.VAPID_PUBLIC_KEY;
    const result = controller.getVapidPublicKey();
    expect(result).toEqual({ publicKey: '' });
  });

  it('should subscribe to push notifications', async () => {
    const dto = {
      userId: 'user-123',
      endpoint: 'https://example.com/push',
      keys: { p256dh: 'key1', auth: 'key2' },
    };

    pushSubscriptionRepository.save.mockResolvedValue();

    const result = await controller.subscribe(dto);

    expect(result).toEqual({ message: 'Subscription saved' });
    expect(pushSubscriptionRepository.save).toHaveBeenCalledWith(
      dto.userId,
      expect.objectContaining({
        endpoint: dto.endpoint,
        keys: dto.keys,
      })
    );
  });

  it('should unsubscribe from push notifications', async () => {
    const dto = {
      userId: 'user-123',
      endpoint: 'https://example.com/push',
      keys: { p256dh: 'key1', auth: 'key2' },
    };

    pushSubscriptionRepository.delete.mockResolvedValue();

    const result = await controller.unsubscribe(dto);

    expect(result).toEqual({ message: 'Subscription removed' });
    expect(pushSubscriptionRepository.delete).toHaveBeenCalledWith(
      dto.userId,
      dto.endpoint
    );
  });
});
