import { Module } from '@nestjs/common';
import { NotificationController } from '../controllers/notification.controller';

@Module({
  controllers: [NotificationController],
})
export class NotificationModule {}

