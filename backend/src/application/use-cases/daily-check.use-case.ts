import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { IMissionRepository } from '@domain/repositories/mission.repository';
import { Mission } from '@domain/entities/mission.entity';
import { DailyMissionRecord } from '@domain/entities/daily-mission-record.entity';
import { MissionScore } from '@domain/entities/mission-score.entity';
import { MISSION_REPOSITORY } from './manage-mission.use-case';

export type MissionWithRecord = {
  mission: Mission;
  record: DailyMissionRecord | null;
};

export type DailyStatus = {
  commuteMissions: MissionWithRecord[];
  returnMissions: MissionWithRecord[];
  completionRate: number;
  streakDay: number;
};

@Injectable()
export class DailyCheckUseCase {
  constructor(
    @Inject(MISSION_REPOSITORY) private readonly repo: IMissionRepository,
  ) {}

  async getDailyStatus(userId: string, date: string): Promise<DailyStatus> {
    const [allMissions, records, existingScore] = await Promise.all([
      this.repo.findByUserId(userId),
      this.repo.findDailyRecords(userId, date),
      this.repo.findScore(userId, date),
    ]);

    const activeMissions = allMissions.filter((m) => m.isActive);
    const recordMap = new Map(records.map((r) => [r.missionId, r]));

    const withRecords: MissionWithRecord[] = activeMissions.map((mission) => ({
      mission,
      record: recordMap.get(mission.id) ?? null,
    }));

    const commuteMissions = withRecords.filter(
      (m) => m.mission.missionType === 'commute',
    );
    const returnMissions = withRecords.filter(
      (m) => m.mission.missionType === 'return',
    );

    const totalMissions = activeMissions.length;
    const completedMissions = withRecords.filter(
      (m) => m.record?.isCompleted,
    ).length;
    const completionRate =
      totalMissions === 0
        ? 0
        : Math.round((completedMissions / totalMissions) * 100);

    let streakDay: number;
    if (existingScore) {
      streakDay = existingScore.streakDay;
    } else {
      streakDay = await this.repo.findLatestStreak(userId);
    }

    return {
      commuteMissions,
      returnMissions,
      completionRate,
      streakDay,
    };
  }

  async toggleCheck(
    userId: string,
    missionId: string,
    date: string,
  ): Promise<DailyMissionRecord> {
    const mission = await this.repo.findById(missionId);
    if (!mission) {
      throw new NotFoundException('미션을 찾을 수 없습니다');
    }
    if (mission.userId !== userId) {
      throw new ForbiddenException('권한이 없습니다');
    }

    let record = await this.repo.findDailyRecord(userId, missionId, date);
    if (!record) {
      record = DailyMissionRecord.createForToday(userId, missionId, date);
    }

    record.toggleCheck();
    const saved = await this.repo.saveDailyRecord(record);

    await this.recalculateScore(userId, date);

    return saved;
  }

  async getDailyScore(
    userId: string,
    date: string,
  ): Promise<MissionScore | null> {
    return this.repo.findScore(userId, date);
  }

  private async recalculateScore(
    userId: string,
    date: string,
  ): Promise<MissionScore> {
    const [allMissions, records, previousStreak] = await Promise.all([
      this.repo.findByUserId(userId),
      this.repo.findDailyRecords(userId, date),
      this.repo.findLatestStreak(userId),
    ]);

    const activeMissions = allMissions.filter((m) => m.isActive);
    const totalMissions = activeMissions.length;
    const completedMissions = records.filter((r) => r.isCompleted).length;

    const newScore = MissionScore.calculate(
      userId,
      date,
      totalMissions,
      completedMissions,
      previousStreak,
    );

    const existingScore = await this.repo.findScore(userId, date);
    if (existingScore) {
      newScore.id = existingScore.id;
    }

    return this.repo.saveScore(newScore);
  }
}
