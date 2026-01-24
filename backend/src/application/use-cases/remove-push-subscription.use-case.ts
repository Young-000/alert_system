import { Inject, Injectable } from '@nestjs/common';
import { IPushSubscriptionRepository } from '@domain/repositories/push-subscription.repository';

@Injectable()
export class RemovePushSubscriptionUseCase {
  constructor(
    @Inject('IPushSubscriptionRepository')
    private pushSubscriptionRepository: IPushSubscriptionRepository
  ) {}

  async execute(endpoint: string): Promise<void> {
    await this.pushSubscriptionRepository.deleteByEndpoint(endpoint);
  }
}
