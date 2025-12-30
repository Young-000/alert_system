import { DataSource, Repository } from 'typeorm';
import { PostgresPushSubscriptionRepository } from './postgres-push-subscription.repository';
import { PushSubscriptionEntity } from './typeorm/push-subscription.entity';
import { PushSubscription } from '@infrastructure/push/push-notification.service';

describe('PostgresPushSubscriptionRepository', () => {
  let repository: PostgresPushSubscriptionRepository;
  let dataSource: jest.Mocked<DataSource>;
  let typeOrmRepository: jest.Mocked<Repository<PushSubscriptionEntity>>;

  beforeEach(() => {
    typeOrmRepository = {
      save: jest.fn(),
      find: jest.fn(),
      delete: jest.fn(),
    } as any;

    dataSource = {
      getRepository: jest.fn().mockReturnValue(typeOrmRepository),
    } as any;

    repository = new PostgresPushSubscriptionRepository(dataSource);
  });

  it('should save push subscription', async () => {
    const userId = 'user-123';
    const subscription: PushSubscription = {
      endpoint: 'https://example.com/push',
      keys: { p256dh: 'key1', auth: 'key2' },
    };

    const entity = new PushSubscriptionEntity();
    entity.userId = userId;
    entity.endpoint = subscription.endpoint;
    entity.keys = subscription.keys;

    typeOrmRepository.save.mockResolvedValue(entity);

    await repository.save(userId, subscription);

    expect(typeOrmRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        userId,
        endpoint: subscription.endpoint,
        keys: subscription.keys,
      })
    );
  });

  it('should find subscriptions by user id', async () => {
    const userId = 'user-123';
    const entity = new PushSubscriptionEntity();
    entity.id = 'sub-123';
    entity.userId = userId;
    entity.endpoint = 'https://example.com/push';
    entity.keys = { p256dh: 'key1', auth: 'key2' };

    typeOrmRepository.find.mockResolvedValue([entity]);

    const result = await repository.findByUserId(userId);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      endpoint: entity.endpoint,
      keys: entity.keys,
    });
    expect(typeOrmRepository.find).toHaveBeenCalledWith({
      where: { userId },
    });
  });

  it('should delete subscription', async () => {
    const userId = 'user-123';
    const endpoint = 'https://example.com/push';

    typeOrmRepository.delete.mockResolvedValue({ affected: 1 } as any);

    await repository.delete(userId, endpoint);

    expect(typeOrmRepository.delete).toHaveBeenCalledWith({
      userId,
      endpoint,
    });
  });
});
