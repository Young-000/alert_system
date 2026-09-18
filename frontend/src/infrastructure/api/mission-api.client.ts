import type { ApiClient } from './api-client';

// ─── Types ───────────────────────────────────────────

export type MissionType = 'commute' | 'return';

/**
 * 서버(`MissionController`)가 실제로 내려주는 6개 필드뿐이다.
 *
 * 컨트롤러는 도메인 객체를 그대로 직렬화하지 않고 필드를 골라 담는다
 * (`mission.controller.ts` getMissions/createMission/updateMission).
 * 예전에는 여기에 `userId`·`createdAt`·`updatedAt`이 함께 선언돼 있었는데,
 * 서버가 보내지 않는 필드라 읽으면 런타임에 `undefined`가 나온다.
 * 타입이 서버보다 넓으면 그 오용이 **컴파일을 통과한다** — 계약은
 * `backend/src/presentation/controllers/mission.controller.spec.ts`가 고정한다.
 */
export type Mission = {
  id: string;
  title: string;
  emoji: string;
  missionType: MissionType;
  isActive: boolean;
  sortOrder: number;
};

/** `POST /missions/daily/:missionId/check` 응답 — 서버는 이 3개만 내려준다. */
export type DailyMissionRecord = {
  missionId: string;
  isCompleted: boolean;
  completedAt: string | null;
};

/**
 * `GET /missions/daily`의 항목. 서버는 기록을 **평탄화해서** 내려주므로
 * `record` 중첩 객체는 존재하지 않는다 — 완료 여부는 `isCompleted`를 직접 읽는다.
 * 중첩된 `mission`도 목록용 4개 필드뿐이다(`isActive`·`sortOrder` 없음).
 */
export type MissionWithRecord = {
  mission: Pick<Mission, 'id' | 'title' | 'emoji' | 'missionType'>;
  isCompleted: boolean;
  completedAt: string | null;
};

export type DailyStatus = {
  commuteMissions: MissionWithRecord[];
  returnMissions: MissionWithRecord[];
  /**
   * 집계 수치는 구버전 백엔드가 내려주지 않아 optional이다.
   * 화면에서는 이 값에 기대지 말고 미션 배열에서 직접 세야 한다 —
   * 없는 필드를 읽어 0/undefined가 되는 사고가 있었다.
   */
  totalMissions?: number;
  completedMissions?: number;
  completionRate: number;
  streakDay: number;
};

/** 일일 점수 — 주간·월간 통계의 `dailyScores` 원소와 같은 모양이다(id·userId 없음). */
export type MissionScore = {
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
  emoji?: string;
  missionType: MissionType;
};

export type UpdateMissionDto = {
  title?: string;
  emoji?: string;
  missionType?: MissionType;
};

// ─── API Client ──────────────────────────────────────

export class MissionApiClient {
  constructor(private apiClient: ApiClient) {}

  async getMissions(): Promise<Mission[]> {
    const res = await this.apiClient.get<{ missions: Mission[] }>('/missions');
    return res.missions;
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

  /** 서버는 바뀐 필드만 돌려준다 — 미션 전체가 아니다. */
  async toggleActive(id: string): Promise<Pick<Mission, 'id' | 'isActive'>> {
    return this.apiClient.patch<Pick<Mission, 'id' | 'isActive'>>(
      `/missions/${id}/toggle`,
      {},
    );
  }

  /** 서버는 바뀐 필드만 돌려준다 — 미션 전체가 아니다. */
  async reorder(id: string, sortOrder: number): Promise<Pick<Mission, 'id' | 'sortOrder'>> {
    return this.apiClient.patch<Pick<Mission, 'id' | 'sortOrder'>>(
      `/missions/${id}/reorder`,
      { sortOrder },
    );
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
