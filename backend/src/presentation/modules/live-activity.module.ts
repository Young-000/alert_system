import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LiveActivityTokenEntity } from '@infrastructure/persistence/typeorm/live-activity-token.entity';
import { LiveActivityController } from '../controllers/live-activity.controller';
import {
  LiveActivityPushService,
  LIVE_ACTIVITY_PUSH_SERVICE,
} from '@application/services/live-activity-push.service';

@Module({
  imports: [TypeOrmModule.forFeature([LiveActivityTokenEntity])],
  controllers: [LiveActivityController],
  providers: [
    LiveActivityPushService,
    {
      provide: LIVE_ACTIVITY_PUSH_SERVICE,
      useExisting: LiveActivityPushService,
    },
  ],
  exports: [LIVE_ACTIVITY_PUSH_SERVICE, TypeOrmModule],
})
export class LiveActivityModule {}
