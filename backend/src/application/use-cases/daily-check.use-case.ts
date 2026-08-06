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
  totalMissions: number;
  completedMissions: number;
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
    const completedMissions = this.countCompleted(activeMissions, records);
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
      totalMissions,
      completedMissions,
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

  /**
   * 완료 개수는 **활성 미션에 달린 기록만** 센다.
   *
   * 기록 목록에는 그날 이후 비활성화되거나 삭제된 미션의 행이 그대로 남는다.
   * 거르지 않고 세면 분자가 분모(활성 미션 수)를 넘어 달성률이 100을 초과하는데,
   * `MissionScore.calculate`는 `completionRate === 100`일 때만 스트릭을 잇기 때문에
   * 초과하는 순간 스트릭이 조용히 0으로 끊긴다. 반대로 활성 미션이 미완료여도
   * 비활성 미션의 완료 기록이 그 자리를 메워 "오늘 다 했다"로 오판할 수 있다.
   *
   * 화면(getDailyStatus)과 저장(recalculateScore)이 각자 세면 반드시 갈라지므로
   * 두 경로가 이 함수 하나를 공유한다.
   */
  private countCompleted(
    activeMissions: Mission[],
    records: DailyMissionRecord[],
  ): number {
    const completedMissionIds = new Set(
      records.filter((r) => r.isCompleted).map((r) => r.missionId),
    );
    return activeMissions.filter((m) => completedMissionIds.has(m.id)).length;
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
    const completedMissions = this.countCompleted(activeMissions, records);

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
