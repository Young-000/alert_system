import { Mission, MissionType } from '@domain/entities/mission.entity';
import { DailyMissionRecord } from '@domain/entities/daily-mission-record.entity';
import { MissionScore } from '@domain/entities/mission-score.entity';

export interface IMissionRepository {
  // Mission CRUD
  findByUserId(userId: string): Promise<Mission[]>;
  findById(id: string): Promise<Mission | null>;
  countByUserAndType(userId: string, missionType: MissionType): Promise<number>;
  saveMission(mission: Mission): Promise<Mission>;
  deleteMission(id: string): Promise<void>;

  // Daily Records
  findDailyRecords(userId: string, date: string): Promise<DailyMissionRecord[]>;
  findDailyRecord(userId: string, missionId: string, date: string): Promise<DailyMissionRecord | null>;
  saveDailyRecord(record: DailyMissionRecord): Promise<DailyMissionRecord>;

  // Scores
  findScore(userId: string, date: string): Promise<MissionScore | null>;
  findScoreRange(userId: string, startDate: string, endDate: string): Promise<MissionScore[]>;
  saveScore(score: MissionScore): Promise<MissionScore>;

  // Stats
  findLatestStreak(userId: string): Promise<number>;
}
