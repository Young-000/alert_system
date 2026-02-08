import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PushController } from '../controllers/push.controller';
import { PushSubscriptionEntity } from '../../infrastructure/persistence/typeorm/push-subscription.entity';
import { WebPushService, WEB_PUSH_SERVICE } from '../../infrastructure/messaging/web-push.service';

@Module({
  imports: [TypeOrmModule.forFeature([PushSubscriptionEntity])],
  controllers: [PushController],
  providers: [
    WebPushService,
    {
      provide: WEB_PUSH_SERVICE,
      useExisting: WebPushService,
    },
  ],
  exports: [WEB_PUSH_SERVICE, TypeOrmModule],
})
export class PushModule {}
