import { SavePushSubscriptionUseCase } from './save-push-subscription.use-case';
import { IPushSubscriptionRepository } from '@domain/repositories/push-subscription.repository';
import { PushSubscription } from '@domain/entities/push-subscription.entity';

describe('SavePushSubscriptionUseCase', () => {
  let useCase: SavePushSubscriptionUseCase;
  let repository: jest.Mocked<IPushSubscriptionRepository>;

  beforeEach(() => {
    repository = {
      save: jest.fn(),
      findByUserId: jest.fn(),
      deleteByEndpoint: jest.fn(),
    };
    useCase = new SavePushSubscriptionUseCase(repository);
  });

  it('should save a subscription', async () => {
    const subscription = new PushSubscription('user-1', 'https://example.com', {
      p256dh: 'p',
      auth: 'a',
    });
    repository.save.mockResolvedValue();

    await useCase.execute(subscription);

    expect(repository.save).toHaveBeenCalledWith(subscription);
  });
});
