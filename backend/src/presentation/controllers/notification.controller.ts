import { Controller, Post, Body, Request, ForbiddenException } from '@nestjs/common';
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
  async subscribe(@Body() subscription: PushSubscriptionDto, @Request() req: any) {
    // 자신의 구독만 생성 가능 (Authorization)
    if (req.user.userId !== subscription.userId) {
      throw new ForbiddenException('다른 사용자의 푸시 구독을 생성할 수 없습니다.');
    }
    const pushSubscription = new PushSubscription(
      subscription.userId,
      subscription.endpoint,
      subscription.keys
    );
    await this.savePushSubscriptionUseCase.execute(pushSubscription);
    return { message: 'Subscription saved' };
  }

  @Post('unsubscribe')
  async unsubscribe(@Body() subscription: PushSubscriptionDto, @Request() req: any) {
    // 자신의 구독만 해제 가능 (Authorization)
    if (req.user.userId !== subscription.userId) {
      throw new ForbiddenException('다른 사용자의 푸시 구독을 해제할 수 없습니다.');
    }
    await this.removePushSubscriptionUseCase.execute(subscription.endpoint);
    return { message: 'Subscription removed' };
  }
}
