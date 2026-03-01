import { Injectable, Logger, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RouteCheckpointEntity } from '@infrastructure/persistence/typeorm/route-checkpoint.entity';
import { CommuteRouteEntity } from '@infrastructure/persistence/typeorm/commute-route.entity';
import { CommuteSessionEntity } from '@infrastructure/persistence/typeorm/commute-session.entity';
import { NeighborStatsDto } from '@application/dto/community.dto';
import { MIN_NEIGHBORS_FOR_STATS } from '@domain/entities/checkpoint-key.util';

@Injectable()
export class CommunityService {
  private readonly logger = new Logger(CommunityService.name);

  constructor(
    @InjectRepository(RouteCheckpointEntity)
    private readonly checkpointRepo: Repository<RouteCheckpointEntity>,
    @InjectRepository(CommuteRouteEntity)
    private readonly routeRepo: Repository<CommuteRouteEntity>,
    @InjectRepository(CommuteSessionEntity)
    private readonly sessionRepo: Repository<CommuteSessionEntity>,
  ) {}

  /**
   * Get neighbor stats for a user's route.
   * Neighbors = users sharing 2+ common checkpoint_keys.
   */
  async getNeighborStats(userId: string, routeId?: string): Promise<NeighborStatsDto> {
    // Find user's route (prefer specified routeId, otherwise preferred route)
    const route = routeId
      ? await this.routeRepo.findOne({ where: { id: routeId, userId } })
      : await this.routeRepo.findOne({ where: { userId, isPreferred: true } })
        ?? await this.routeRepo.findOne({ where: { userId }, order: { createdAt: 'DESC' } });

    if (!route) {
      return {
        routeId: null,
        neighborCount: 0,
        avgDurationMinutes: null,
        myAvgDurationMinutes: null,
        diffMinutes: null,
        dataStatus: 'no_route',
      };
    }

    // Get user's checkpoint keys
    const myCheckpoints = await this.checkpointRepo.find({
      where: { routeId: route.id },
      select: ['checkpointKey'],
    });

    const myKeys = myCheckpoints
      .map((c) => c.checkpointKey)
      .filter((k): k is string => !!k);

    if (myKeys.length < 2) {
      return {
        routeId: route.id,
        neighborCount: 0,
        avgDurationMinutes: null,
        myAvgDurationMinutes: null,
        diffMinutes: null,
        dataStatus: 'insufficient',
      };
    }

    // Find neighbors: users sharing 2+ checkpoint_keys
    const neighborResult = await this.checkpointRepo
      .createQueryBuilder('rc')
      .innerJoin(CommuteRouteEntity, 'cr', 'cr.id = rc.route_id')
      .select('cr.user_id', 'userId')
      .addSelect('COUNT(DISTINCT rc.checkpoint_key)', 'sharedCount')
      .where('rc.checkpoint_key IN (:...keys)', { keys: myKeys })
      .andWhere('cr.user_id != :userId', { userId })
      .andWhere('rc.checkpoint_key IS NOT NULL')
      .groupBy('cr.user_id')
      .having('COUNT(DISTINCT rc.checkpoint_key) >= 2')
      .getRawMany<{ userId: string; sharedCount: string }>();

    const neighborCount = neighborResult.length;

    if (neighborCount < MIN_NEIGHBORS_FOR_STATS) {
      return {
        routeId: route.id,
        neighborCount,
        avgDurationMinutes: null,
        myAvgDurationMinutes: null,
        diffMinutes: null,
        dataStatus: 'insufficient',
      };
    }

    // Get neighbor avg duration (completed sessions in last 30 days)
    const neighborIds = neighborResult.map((n) => n.userId);

    const neighborAvgResult = await this.sessionRepo
      .createQueryBuilder('cs')
      .select('AVG(cs.total_duration_minutes)', 'avgDuration')
      .where('cs.user_id IN (:...neighborIds)', { neighborIds })
      .andWhere('cs.status = :status', { status: 'completed' })
      .andWhere('cs.total_duration_minutes IS NOT NULL')
      .andWhere('cs.completed_at > :since', {
        since: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      })
      .getRawOne<{ avgDuration: string | null }>();

    const neighborAvg = neighborAvgResult?.avgDuration
      ? Math.round(parseFloat(neighborAvgResult.avgDuration))
      : null;

    // Get user's own avg duration
    const myAvgResult = await this.sessionRepo
      .createQueryBuilder('cs')
      .select('AVG(cs.total_duration_minutes)', 'avgDuration')
      .where('cs.user_id = :userId', { userId })
      .andWhere('cs.route_id = :routeId', { routeId: route.id })
      .andWhere('cs.status = :status', { status: 'completed' })
      .andWhere('cs.total_duration_minutes IS NOT NULL')
      .andWhere('cs.completed_at > :since', {
        since: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      })
      .getRawOne<{ avgDuration: string | null }>();

    const myAvg = myAvgResult?.avgDuration
      ? Math.round(parseFloat(myAvgResult.avgDuration))
      : null;

    const diff = (neighborAvg !== null && myAvg !== null)
      ? myAvg - neighborAvg
      : null;

    return {
      routeId: route.id,
      neighborCount,
      avgDurationMinutes: neighborAvg,
      myAvgDurationMinutes: myAvg,
      diffMinutes: diff,
      dataStatus: 'sufficient',
    };
  }
}
