import { RemovePushSubscriptionUseCase } from './remove-push-subscription.use-case';
import { IPushSubscriptionRepository } from '@domain/repositories/push-subscription.repository';

describe('RemovePushSubscriptionUseCase', () => {
  let useCase: RemovePushSubscriptionUseCase;
  let repository: jest.Mocked<IPushSubscriptionRepository>;

  beforeEach(() => {
    repository = {
      save: jest.fn(),
      findByUserId: jest.fn(),
      deleteByEndpoint: jest.fn(),
    };
    useCase = new RemovePushSubscriptionUseCase(repository);
  });

  it('should remove subscription by endpoint', async () => {
    repository.deleteByEndpoint.mockResolvedValue();

    await useCase.execute('https://example.com');

    expect(repository.deleteByEndpoint).toHaveBeenCalledWith('https://example.com');
  });
});
