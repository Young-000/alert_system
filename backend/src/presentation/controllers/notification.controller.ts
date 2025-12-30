import { Controller, Post, Body, Inject } from '@nestjs/common';
import { IPushSubscriptionRepository } from '@domain/repositories/push-subscription.repository';
import { PushSubscription } from '@infrastructure/push/push-notification.service';

export interface PushSubscriptionDto {
  userId: string;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

@Controller('notifications')
export class NotificationController {
  constructor(
    @Inject('IPushSubscriptionRepository')
    private pushSubscriptionRepository: IPushSubscriptionRepository
  ) {}

  @Post('subscribe')
  async subscribe(@Body() dto: PushSubscriptionDto) {
    const subscription: PushSubscription = {
      endpoint: dto.endpoint,
      keys: dto.keys,
    };
    await this.pushSubscriptionRepository.save(dto.userId, subscription);
    return { message: 'Subscription saved' };
  }

  @Post('unsubscribe')
  async unsubscribe(@Body() dto: PushSubscriptionDto) {
    await this.pushSubscriptionRepository.delete(dto.userId, dto.endpoint);
    return { message: 'Subscription removed' };
  }
}

