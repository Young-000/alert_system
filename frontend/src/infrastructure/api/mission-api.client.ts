import type { ApiClient } from './api-client';

// ─── Types ───────────────────────────────────────────

export type MissionType = 'commute' | 'return';

export type Mission = {
  id: string;
  userId: string;
  title: string;
  emoji: string;
  missionType: MissionType;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type DailyMissionRecord = {
  id: string;
  userId: string;
  missionId: string;
  date: string;
  isCompleted: boolean;
  completedAt: string | null;
};

export type MissionWithRecord = {
  mission: Mission;
  record: DailyMissionRecord | null;
  isCompleted: boolean;
};

export type DailyStatus = {
  commuteMissions: MissionWithRecord[];
  returnMissions: MissionWithRecord[];
  totalMissions: number;
  completedMissions: number;
  completionRate: number;
  streakDay: number;
};

export type MissionScore = {
  id: string;
  userId: string;
  date: string;
  totalMissions: number;
  completedMissions: number;
  completionRate: number;
  streakDay: number;
};

export type WeeklyStats = {
  totalCompleted: number;
  totalMissions: number;
  completionRate: number;
  dailyScores: MissionScore[];
};

export type MonthlyStats = WeeklyStats;

export type CreateMissionDto = {
  title: string;
  missionType: MissionType;
};

export type UpdateMissionDto = {
  title?: string;
  missionType?: MissionType;
};

// ─── API Client ──────────────────────────────────────

export class MissionApiClient {
  constructor(private apiClient: ApiClient) {}

  async getMissions(): Promise<Mission[]> {
    return this.apiClient.get<Mission[]>('/missions');
  }

  async createMission(dto: CreateMissionDto): Promise<Mission> {
    return this.apiClient.post<Mission>('/missions', dto);
  }

  async updateMission(id: string, dto: UpdateMissionDto): Promise<Mission> {
    return this.apiClient.patch<Mission>(`/missions/${id}`, dto);
  }

  async deleteMission(id: string): Promise<void> {
    await this.apiClient.delete(`/missions/${id}`);
  }

  async toggleActive(id: string): Promise<Mission> {
    return this.apiClient.patch<Mission>(`/missions/${id}/toggle`, {});
  }

  async reorder(id: string, sortOrder: number): Promise<Mission> {
    return this.apiClient.patch<Mission>(`/missions/${id}/reorder`, { sortOrder });
  }

  async getDailyStatus(): Promise<DailyStatus> {
    return this.apiClient.get<DailyStatus>('/missions/daily');
  }

  async toggleCheck(missionId: string): Promise<DailyMissionRecord> {
    return this.apiClient.post<DailyMissionRecord>(
      `/missions/daily/${missionId}/check`,
      {},
    );
  }

  async getDailyScore(): Promise<MissionScore | null> {
    return this.apiClient.get<MissionScore | null>('/missions/daily/score');
  }

  async getWeeklyStats(): Promise<WeeklyStats> {
    return this.apiClient.get<WeeklyStats>('/missions/stats/weekly');
  }

  async getMonthlyStats(): Promise<MonthlyStats> {
    return this.apiClient.get<MonthlyStats>('/missions/stats/monthly');
  }

  async getStreak(): Promise<{ streakDay: number }> {
    return this.apiClient.get<{ streakDay: number }>('/missions/streak');
  }
}
