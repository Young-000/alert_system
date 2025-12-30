import { Controller, Post, Body } from '@nestjs/common';

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
  @Post('subscribe')
  async subscribe(@Body() subscription: PushSubscriptionDto) {
    // TODO: Save push subscription to database
    return { message: 'Subscription saved' };
  }

  @Post('unsubscribe')
  async unsubscribe(@Body() subscription: PushSubscriptionDto) {
    // TODO: Remove push subscription from database
    return { message: 'Subscription removed' };
  }
}

