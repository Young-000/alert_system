import {
  Controller,
  Get,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationLogEntity } from '../../infrastructure/persistence/typeorm/notification-log.entity';
import { AuthenticatedRequest } from '@infrastructure/auth/authenticated-request';
import { parseBoundedInt, MAX_OFFSET } from '../utils/query-param';

/** 통계 집계 기간 상한(일). 이보다 오래된 알림 로그는 어떤 화면도 쓰지 않는다. */
const MAX_STATS_DAYS = 365;

export interface NotificationStatsDto {
  total: number;
  success: number;
  fallback: number;
  failed: number;
  successRate: number;
}

@Controller('notifications')
@UseGuards(AuthGuard('jwt'))
export class NotificationHistoryController {
  constructor(
    @InjectRepository(NotificationLogEntity)
    private readonly logRepo: Repository<NotificationLogEntity>,
  ) {}

  @Get('stats')
  async getStats(
    @Request() req: AuthenticatedRequest,
    @Query('days') days?: string,
  ): Promise<NotificationStatsDto> {
    // 상한이 없으면 `INTERVAL '1 day' * 1e21`이 Postgres에서 interval 범위를 넘겨 500이 된다.
    // 0 = 필터 없음(전체 기간)이므로 fallback/min은 0으로 둔다.
    const daysNum = parseBoundedInt(days, { fallback: 0, min: 0, max: MAX_STATS_DAYS });

    const qb = this.logRepo
      .createQueryBuilder('log')
      .select('log.status', 'status')
      .addSelect('COUNT(*)::int', 'count')
      .where('log.userId = :userId', { userId: req.user.userId });

    if (daysNum > 0) {
      qb.andWhere("log.sentAt >= NOW() - INTERVAL '1 day' * :days", { days: daysNum });
    }

    qb.groupBy('log.status');

    const rows: { status: string; count: number }[] = await qb.getRawMany();

    let success = 0;
    let fallback = 0;
    let failed = 0;

    for (const row of rows) {
      const count = Number(row.count);
      switch (row.status) {
        case 'success':
          success = count;
          break;
        case 'fallback':
          fallback = count;
          break;
        case 'failed':
          failed = count;
          break;
      }
    }

    const total = success + fallback + failed;
    const successRate = total === 0
      ? 100
      : Math.round((success / total) * 1000) / 10;

    return { total, success, fallback, failed, successRate };
  }

  @Get('history')
  async getHistory(
    @Request() req: AuthenticatedRequest,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ): Promise<{ items: NotificationLogEntity[]; total: number }> {
    const take = parseBoundedInt(limit, { fallback: 20, min: 1, max: 50 });
    const skip = parseBoundedInt(offset, { fallback: 0, min: 0, max: MAX_OFFSET });

    const [items, total] = await this.logRepo.findAndCount({
      where: { userId: req.user.userId },
      order: { sentAt: 'DESC' },
      take,
      skip,
    });

    return { items, total };
  }
}
