import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IUserRepository } from '@domain/repositories/user.repository';
import {
  ICommuteSessionRepository,
  COMMUTE_SESSION_REPOSITORY,
} from '@domain/repositories/commute-session.repository';
import { CommuteSessionEntity } from '@infrastructure/persistence/typeorm/commute-session.entity';
import { NotificationLogEntity } from '@infrastructure/persistence/typeorm/notification-log.entity';
import {
  ISolapiService,
  SOLAPI_SERVICE,
  WeeklyReportVariables,
} from '@infrastructure/messaging/solapi.service';
import { IWebPushService, WEB_PUSH_SERVICE } from '@infrastructure/messaging/web-push.service';

const DAYS_IN_WEEK = 7;
const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

@Injectable()
export class GenerateWeeklyReportUseCase {
  private readonly logger = new Logger(GenerateWeeklyReportUseCase.name);

  constructor(
    @Inject('IUserRepository') private userRepository: IUserRepository,
    @Optional() @Inject(COMMUTE_SESSION_REPOSITORY) private sessionRepository?: ICommuteSessionRepository,
    @Optional() @InjectRepository(CommuteSessionEntity) private sessionRepo?: Repository<CommuteSessionEntity>,
    @Optional() @InjectRepository(NotificationLogEntity) private notificationLogRepo?: Repository<NotificationLogEntity>,
    @Optional() @Inject(SOLAPI_SERVICE) private solapiService?: ISolapiService,
    @Optional() @Inject(WEB_PUSH_SERVICE) private webPushService?: IWebPushService,
  ) {}

  async execute(): Promise<{ sent: number; skipped: number }> {
    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - DAYS_IN_WEEK);

    // Find active users: those with completed sessions in the past week
    const activeUserIds = await this.findActiveUserIds(weekAgo, now);
    this.logger.log(`Found ${activeUserIds.length} active users for weekly report`);

    let sent = 0;
    let skipped = 0;

    for (const userId of activeUserIds) {
      try {
        const didSend = await this.generateAndSendReport(userId, weekAgo, now);
        if (didSend) {
          sent++;
        } else {
          skipped++;
        }
      } catch (error) {
        this.logger.warn(`Failed to generate report for user ${userId}: ${error}`);
        skipped++;
      }
    }

    this.logger.log(`Weekly report complete: ${sent} sent, ${skipped} skipped`);
    return { sent, skipped };
  }

  private async findActiveUserIds(startDate: Date, endDate: Date): Promise<string[]> {
    if (!this.sessionRepo) return [];

    const result = await this.sessionRepo
      .createQueryBuilder('session')
      .select('DISTINCT session.userId', 'userId')
      .where('session.status = :status', { status: 'completed' })
      .andWhere('session.startedAt >= :startDate', { startDate })
      .andWhere('session.startedAt <= :endDate', { endDate })
      .getRawMany<{ userId: string }>();

    return result.map(r => r.userId);
  }

  private async generateAndSendReport(
    userId: string,
    weekStart: Date,
    weekEnd: Date,
  ): Promise<boolean> {
    const user = await this.userRepository.findById(userId);
    if (!user) return false;

    // Fetch completed sessions for the week
    const sessions = this.sessionRepository
      ? await this.sessionRepository.findByUserIdInDateRange(userId, weekStart, weekEnd)
      : [];

    const completedSessions = sessions.filter(s => s.status.toString() === 'completed');
    if (completedSessions.length === 0) return false;

    // Calculate stats
    const totalCommutes = completedSessions.length;
    const durations = completedSessions
      .map(s => s.totalDurationMinutes)
      .filter((d): d is number => d != null && d > 0);

    const avgDuration = durations.length > 0
      ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
      : 0;

    // Find best day (shortest average commute)
    const dayStats = new Map<number, { total: number; count: number }>();
    for (const session of completedSessions) {
      const day = new Date(session.startedAt).getDay();
      const existing = dayStats.get(day) || { total: 0, count: 0 };
      existing.total += session.totalDurationMinutes || 0;
      existing.count++;
      dayStats.set(day, existing);
    }

    let bestDay = '없음';
    let bestAvg = Infinity;
    for (const [day, stats] of dayStats.entries()) {
      const avg = stats.count > 0 ? stats.total / stats.count : Infinity;
      if (avg < bestAvg) {
        bestAvg = avg;
        bestDay = `${DAY_NAMES[day]}요일`;
      }
    }

    // Generate tip
    const tip = this.generateWeeklyTip(totalCommutes, avgDuration, completedSessions);

    // Format week range
    const weekRange = `${weekStart.getMonth() + 1}/${weekStart.getDate()}~${weekEnd.getMonth() + 1}/${weekEnd.getDate()}`;

    const variables: WeeklyReportVariables = {
      userName: user.name,
      weekRange,
      totalCommutes: `${totalCommutes}`,
      avgDuration: `${avgDuration}분`,
      bestDay,
      tip,
    };

    // Send via Solapi (when template is approved)
    if (this.solapiService && user.phoneNumber) {
      await this.solapiService.sendWeeklyReport(user.phoneNumber, variables);
    }

    // Also send Web Push summary
    if (this.webPushService) {
      const title = `📊 주간 출퇴근 리포트`;
      const body = `${weekRange} | ${totalCommutes}회 출퇴근, 평균 ${avgDuration}분. ${tip}`;
      await this.webPushService.sendToUser(userId, title, body, '/dashboard').catch(
        err => this.logger.warn(`Web push failed for weekly report: ${err}`),
      );
    }

    this.logger.log(`Weekly report sent for user ${userId}: ${totalCommutes} commutes, avg ${avgDuration}min`);
    return true;
  }

  private generateWeeklyTip(
    totalCommutes: number,
    avgDuration: number,
    sessions: Array<{ totalDurationMinutes?: number; totalDelayMinutes: number }>,
  ): string {
    const totalDelay = sessions.reduce((sum, s) => sum + (s.totalDelayMinutes || 0), 0);
    const avgDelay = totalCommutes > 0 ? Math.round(totalDelay / totalCommutes) : 0;

    if (avgDelay <= 0) return '정시 출퇴근 유지 중! 잘하고 있어요';
    if (avgDelay <= 3) return '거의 정시! 이 페이스를 유지하세요';
    if (avgDelay <= 5) return `평균 ${avgDelay}분 지연. 5분 일찍 출발해보세요`;
    return `평균 ${avgDelay}분 지연. 출발 시간이나 경로를 조정해보세요`;
  }
}
