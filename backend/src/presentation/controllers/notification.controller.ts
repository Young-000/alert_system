import { Controller, Post, Body } from '@nestjs/common';
import { SavePushSubscriptionUseCase } from '@application/use-cases/save-push-subscription.use-case';
import { RemovePushSubscriptionUseCase } from '@application/use-cases/remove-push-subscription.use-case';
import { PushSubscription } from '@domain/entities/push-subscription.entity';

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
    private savePushSubscriptionUseCase: SavePushSubscriptionUseCase,
    private removePushSubscriptionUseCase: RemovePushSubscriptionUseCase
  ) {}

  @Post('subscribe')
  async subscribe(@Body() subscription: PushSubscriptionDto) {
    const pushSubscription = new PushSubscription(
      subscription.userId,
      subscription.endpoint,
      subscription.keys
    );
    await this.savePushSubscriptionUseCase.execute(pushSubscription);
    return { message: 'Subscription saved' };
  }

  @Post('unsubscribe')
  async unsubscribe(@Body() subscription: PushSubscriptionDto) {
    await this.removePushSubscriptionUseCase.execute(subscription.endpoint);
    return { message: 'Subscription removed' };
  }
}
