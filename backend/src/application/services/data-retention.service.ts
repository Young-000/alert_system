import { Injectable, Logger, Inject, Optional } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { IBehaviorEventRepository } from '../../domain/repositories/behavior-event.repository';
import { ICommuteRecordRepository } from '../../domain/repositories/commute-record.repository';
import { DEFAULT_PRIVACY_SETTINGS } from '../../domain/entities/privacy-settings.entity';

export const BEHAVIOR_EVENT_REPOSITORY = Symbol('BEHAVIOR_EVENT_REPOSITORY');
export const COMMUTE_RECORD_REPOSITORY = Symbol('COMMUTE_RECORD_REPOSITORY');

@Injectable()
export class DataRetentionService {
  private readonly logger = new Logger(DataRetentionService.name);

  constructor(
    @Optional()
    @Inject(BEHAVIOR_EVENT_REPOSITORY)
    private readonly behaviorEventRepository: IBehaviorEventRepository | null,
    @Optional()
    @Inject(COMMUTE_RECORD_REPOSITORY)
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
