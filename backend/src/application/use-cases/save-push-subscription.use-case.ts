import { Inject } from '@nestjs/common';
import { IPushSubscriptionRepository } from '@domain/repositories/push-subscription.repository';
import { PushSubscription } from '@domain/entities/push-subscription.entity';

export class SavePushSubscriptionUseCase {
  constructor(
    @Inject('IPushSubscriptionRepository')
    private pushSubscriptionRepository: IPushSubscriptionRepository
  ) {}

  async execute(subscription: PushSubscription): Promise<void> {
    await this.pushSubscriptionRepository.save(subscription);
  }
}
