import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ApiCacheService } from './api-cache.service';

@Injectable()
export class CacheCleanupService {
  private readonly logger = new Logger(CacheCleanupService.name);

  constructor(private readonly apiCacheService: ApiCacheService) {}

  // 매 시간 만료된 캐시 정리
  @Cron(CronExpression.EVERY_HOUR)
  async handleCacheCleanup() {
    this.logger.log('Running cache cleanup...');
    await this.apiCacheService.cleanupExpiredCache();
  }

  // 매일 자정에 오래된 로그 정리
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleLogCleanup() {
    this.logger.log('Running API log cleanup...');
    await this.apiCacheService.cleanupOldLogs();
  }
}
