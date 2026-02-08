import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationHistoryController } from '../controllers/notification-history.controller';
import { NotificationLogEntity } from '../../infrastructure/persistence/typeorm/notification-log.entity';

@Module({
  imports: [TypeOrmModule.forFeature([NotificationLogEntity])],
  controllers: [NotificationHistoryController],
  exports: [TypeOrmModule],
})
export class NotificationHistoryModule {}
