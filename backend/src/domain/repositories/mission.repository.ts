import { Mission } from '@domain/entities/mission.entity';
import { DailyMissionRecord } from '@domain/entities/daily-mission-record.entity';
import { MissionScore } from '@domain/entities/mission-score.entity';

export interface IMissionRepository {
  // Mission CRUD
  findByUserId(userId: string): Promise<Mission[]>;
  findById(id: string): Promise<Mission | null>;
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
  /**
   * 최신 점수 행의 streakDay.
   * @param beforeDate 'YYYY-MM-DD' — 주어지면 이 날짜 **이전(exclusive)** 행만 본다.
   *   오늘 점수를 재계산할 때는 반드시 오늘 날짜를 넘겨야 한다 — 안 넘기면
   *   방금 저장한 오늘 행이 previousStreak으로 잡혀 스트릭이 매일 리셋된다.
   */
  findLatestStreak(userId: string, beforeDate?: string): Promise<number>;
}
