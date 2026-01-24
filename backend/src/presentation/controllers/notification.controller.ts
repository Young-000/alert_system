import { Controller, Post, Body, Req, ForbiddenException } from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import { SavePushSubscriptionUseCase } from '@application/use-cases/save-push-subscription.use-case';
import { RemovePushSubscriptionUseCase } from '@application/use-cases/remove-push-subscription.use-case';
import { PushSubscription } from '@domain/entities/push-subscription.entity';
import { PushSubscriptionDto, UnsubscribeDto } from '@application/dto/push-subscription.dto';

interface AuthenticatedRequest extends ExpressRequest {
  user: { userId: string };
}

@Controller('notifications')
export class NotificationController {
  constructor(
    private savePushSubscriptionUseCase: SavePushSubscriptionUseCase,
    private removePushSubscriptionUseCase: RemovePushSubscriptionUseCase
  ) {}

  @Post('subscribe')
  async subscribe(@Body() subscription: PushSubscriptionDto, @Req() req: AuthenticatedRequest) {
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
  async unsubscribe(@Body() subscription: UnsubscribeDto, @Req() req: AuthenticatedRequest) {
    // 자신의 구독만 해제 가능 (Authorization)
    if (req.user.userId !== subscription.userId) {
      throw new ForbiddenException('다른 사용자의 푸시 구독을 해제할 수 없습니다.');
    }
    await this.removePushSubscriptionUseCase.execute(subscription.endpoint);
    return { message: 'Subscription removed' };
  }
}
