import { Injectable, Logger, Inject, Optional } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { IBehaviorEventRepository } from '../../domain/repositories/behavior-event.repository';
import { ICommuteRecordRepository } from '../../domain/repositories/commute-record.repository';
import { DEFAULT_PRIVACY_SETTINGS } from '../../domain/entities/privacy-settings.entity';

@Injectable()
export class DataRetentionService {
  private readonly logger = new Logger(DataRetentionService.name);

  constructor(
    // 토큰은 문자열이어야 한다 — 이 서비스를 등록하는 PrivacyModule이
    // 'BEHAVIOR_EVENT_REPOSITORY'/'COMMUTE_RECORD_REPOSITORY' 문자열로 저장소를 제공하고,
    // 같은 모듈의 ExportUserDataUseCase도 같은 문자열을 쓴다.
    // 여기서 자체 Symbol을 쓰면 @Optional() 탓에 부팅은 되지만 저장소가 조용히 null이 되어
    // GDPR 삭제와 보관기간 크론이 아무 일도 하지 않는다.
    @Optional()
    @Inject('BEHAVIOR_EVENT_REPOSITORY')
    private readonly behaviorEventRepository: IBehaviorEventRepository | null,
    @Optional()
    @Inject('COMMUTE_RECORD_REPOSITORY')
    private readonly commuteRecordRepository: ICommuteRecordRepository | null,
  ) {}

  /**
   * Run data cleanup every day at 3 AM
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async cleanupOldData(): Promise<void> {
    this.logger.log('Starting scheduled data retention cleanup...');

    try {
      const results = await Promise.all([
        this.cleanupBehaviorEvents(),
        this.cleanupCommuteRecords(),
      ]);

      this.logger.log(
        `Data cleanup completed. Behavior events: ${results[0]}, Commute records: ${results[1]}`,
      );
    } catch (error) {
      this.logger.error('Data retention cleanup failed:', error);
    }
  }

  /**
   * Clean up behavior events older than retention period
   */
  async cleanupBehaviorEvents(
    maxDays: number = DEFAULT_PRIVACY_SETTINGS.retention.behaviorEventsMaxDays,
  ): Promise<number> {
    if (!this.behaviorEventRepository) {
      this.logger.warn('BehaviorEventRepository not available, skipping cleanup');
      return 0;
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - maxDays);

    try {
      const deletedCount = await this.behaviorEventRepository.deleteOlderThan(cutoffDate);
      this.logger.log(`Deleted ${deletedCount} behavior events older than ${maxDays} days`);
      return deletedCount;
    } catch (error) {
      this.logger.error('Failed to cleanup behavior events:', error);
      return 0;
    }
  }

  /**
   * Clean up commute records older than retention period
   */
  async cleanupCommuteRecords(
    maxDays: number = DEFAULT_PRIVACY_SETTINGS.retention.commuteRecordsMaxDays,
  ): Promise<number> {
    if (!this.commuteRecordRepository) {
      this.logger.warn('CommuteRecordRepository not available, skipping cleanup');
      return 0;
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - maxDays);

    try {
      const deletedCount = await this.commuteRecordRepository.deleteOlderThan(cutoffDate);
      this.logger.log(`Deleted ${deletedCount} commute records older than ${maxDays} days`);
      return deletedCount;
    } catch (error) {
      this.logger.error('Failed to cleanup commute records:', error);
      return 0;
    }
  }

  /**
   * Clean up all data for a specific user (for GDPR compliance)
   */
  async deleteAllUserData(userId: string): Promise<{
    behaviorEvents: number;
    commuteRecords: number;
  }> {
    this.logger.log(`Deleting all data for user: ${userId}`);

    const results = {
      behaviorEvents: 0,
      commuteRecords: 0,
    };

    if (this.behaviorEventRepository) {
      results.behaviorEvents = await this.behaviorEventRepository.deleteByUserId(userId);
    }

    if (this.commuteRecordRepository) {
      results.commuteRecords = await this.commuteRecordRepository.deleteByUserId(userId);
    }

    this.logger.log(
      `Deleted user data - Behavior events: ${results.behaviorEvents}, Commute records: ${results.commuteRecords}`,
    );

    return results;
  }
}
