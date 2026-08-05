import { subtractDays, getWeekStartKST } from '@domain/utils/kst-date';

export type StreakStatus = 'active' | 'at_risk' | 'broken' | 'new';
export type MilestoneType = '7d' | '14d' | '30d' | '60d' | '100d';

export interface MilestoneDefinition {
  type: MilestoneType;
  days: number;
  label: string;
  badge: string;
  badgeName: string;
}

export const MILESTONES: readonly MilestoneDefinition[] = [
  { type: '7d', days: 7, label: '7일 연속', badge: '🥉', badgeName: '첫걸음' },
  { type: '14d', days: 14, label: '14일 연속', badge: '🏃', badgeName: '습관 형성' },
  { type: '30d', days: 30, label: '30일 연속', badge: '🥈', badgeName: '한 달 챔피언' },
  { type: '60d', days: 60, label: '60일 연속', badge: '💪', badgeName: '철인' },
  { type: '100d', days: 100, label: '100일 연속', badge: '🥇', badgeName: '전설' },
] as const;

export interface RecordCompletionResult {
  updated: boolean;
  milestoneAchieved: MilestoneType | null;
}

export interface NextMilestoneInfo {
  type: MilestoneType;
  label: string;
  daysRemaining: number;
  progress: number;
}

export class CommuteStreak {
  id: string;
  userId: string;
  currentStreak: number;
  streakStartDate: string | null;
  lastRecordDate: string | null;
  bestStreak: number;
  bestStreakStart: string | null;
  bestStreakEnd: string | null;
  weeklyGoal: number;
  weeklyCount: number;
  weekStartDate: string | null;
  milestonesAchieved: MilestoneType[];
  latestMilestone: MilestoneType | null;
  excludeWeekends: boolean;
  reminderEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;

  constructor(
    userId: string,
    options?: {
      id?: string;
      currentStreak?: number;
      streakStartDate?: string | null;
      lastRecordDate?: string | null;
      bestStreak?: number;
      bestStreakStart?: string | null;
      bestStreakEnd?: string | null;
      weeklyGoal?: number;
      weeklyCount?: number;
      weekStartDate?: string | null;
      milestonesAchieved?: MilestoneType[];
      latestMilestone?: MilestoneType | null;
      excludeWeekends?: boolean;
      reminderEnabled?: boolean;
      createdAt?: Date;
      updatedAt?: Date;
    },
  ) {
    this.id = options?.id ?? '';
    this.userId = userId;
    this.currentStreak = options?.currentStreak ?? 0;
    this.streakStartDate = options?.streakStartDate ?? null;
    this.lastRecordDate = options?.lastRecordDate ?? null;
    this.bestStreak = options?.bestStreak ?? 0;
    this.bestStreakStart = options?.bestStreakStart ?? null;
    this.bestStreakEnd = options?.bestStreakEnd ?? null;
    this.weeklyGoal = options?.weeklyGoal ?? 5;
    this.weeklyCount = options?.weeklyCount ?? 0;
    this.weekStartDate = options?.weekStartDate ?? null;
    this.milestonesAchieved = options?.milestonesAchieved ?? [];
    this.latestMilestone = options?.latestMilestone ?? null;
    this.excludeWeekends = options?.excludeWeekends ?? false;
    this.reminderEnabled = options?.reminderEnabled ?? true;
    this.createdAt = options?.createdAt ?? new Date();
    this.updatedAt = options?.updatedAt ?? new Date();
  }

  static createNew(userId: string): CommuteStreak {
    return new CommuteStreak(userId);
  }

  /**
   * 스트릭 갱신 핵심 로직
   * - todayKST: 한국 시간 기준 오늘 날짜 (YYYY-MM-DD)
   * - 이미 오늘 기록됨 -> 스킵
   * - 어제 기록 있음 -> 스트릭 연장
   * - 어제 기록 없음 -> 새 스트릭 시작
   */
  recordCompletion(todayKST: string): RecordCompletionResult {
    // 이미 오늘 기록됨 -> 스킵
    if (this.lastRecordDate === todayKST) {
      return { updated: false, milestoneAchieved: null };
    }

    const yesterday = subtractDays(todayKST, 1);

    if (this.lastRecordDate === yesterday) {
      // 어제 기록 있음 -> 스트릭 연장
      this.currentStreak += 1;
    } else {
      // 어제 기록 없음 -> 새 스트릭 시작
      this.currentStreak = 1;
      this.streakStartDate = todayKST;
    }

    this.lastRecordDate = todayKST;

    // 최고 기록 갱신 — 구간은 항상 지금 진행 중인 스트릭의 것이다.
    // (옛 기록의 시작일을 남겨두면 새 스트릭이 기록을 경신하는 순간
    //  bestStreakStart~bestStreakEnd가 실재하지 않는 긴 구간으로 날조된다)
    if (this.currentStreak > this.bestStreak) {
      this.bestStreak = this.currentStreak;
      this.bestStreakStart = this.streakStartDate ?? todayKST;
      this.bestStreakEnd = todayKST;
    }

    // 주간 카운트 갱신
    this.updateWeeklyCount(todayKST);

    // 마일스톤 확인
    const milestoneAchieved = this.checkMilestone();

    this.updatedAt = new Date();

    return { updated: true, milestoneAchieved };
  }

  /** 현재 스트릭 상태 판단 */
  getStatus(todayKST: string): StreakStatus {
    if (!this.lastRecordDate) return 'new';

    if (this.lastRecordDate === todayKST) return 'active';

    // 어제까지 기록했지만 오늘은 아직 — 스트릭은 살아 있으나 오늘 넘기면 끊긴다.
    const yesterday = subtractDays(todayKST, 1);
    if (this.lastRecordDate === yesterday) return 'at_risk';

    // 2일 이상 빠짐
    return 'broken';
  }

  /** 새 마일스톤 달성 확인 */
  checkMilestone(): MilestoneType | null {
    for (const milestone of MILESTONES) {
      if (
        this.currentStreak >= milestone.days &&
        !this.milestonesAchieved.includes(milestone.type)
      ) {
        this.milestonesAchieved.push(milestone.type);
        this.latestMilestone = milestone.type;
        return milestone.type;
      }
    }
    return null;
  }

  /** 다음 미달성 마일스톤 정보 */
  getNextMilestone(): NextMilestoneInfo | null {
    for (const milestone of MILESTONES) {
      if (!this.milestonesAchieved.includes(milestone.type)) {
        const daysRemaining = Math.max(0, milestone.days - this.currentStreak);
        const progress = Math.min(1, this.currentStreak / milestone.days);
        return {
          type: milestone.type,
          label: milestone.label,
          daysRemaining,
          progress,
        };
      }
    }
    return null;
  }

  /** 주간 카운트 갱신 — 새 주가 시작되면 리셋 */
  private updateWeeklyCount(todayKST: string): void {
    const currentWeekStart = getWeekStartKST(todayKST);
    if (this.weekStartDate !== currentWeekStart) {
      // 새 주 시작
      this.weeklyCount = 1;
      this.weekStartDate = currentWeekStart;
    } else {
      this.weeklyCount += 1;
    }
  }

  /**
   * 스트릭이 이미 끊겼으면 0으로 리셋 (조회 시 사용)
   *
   * currentStreak은 마지막 recordCompletion 시점의 값으로 굳어 있다. 2일 이상
   * 빠지면 그 값은 더 이상 "연속 일수"가 아니지만, 다음 기록 전까지는 저장소에
   * 그대로 남는다. 조회 경로에서 바로잡지 않으면 "다시 시작해보세요"와
   * "연속 12일"이 한 화면에 같이 나간다.
   *
   * lastRecordDate는 지우지 않는다 — 지우면 상태가 'new'로 바뀌어
   * 끊긴 사용자가 첫 사용자 안내를 받게 된다. 최고 기록과 획득 배지도 보존한다.
   */
  ensureStreakCurrent(todayKST: string): void {
    if (this.getStatus(todayKST) !== 'broken') return;

    this.currentStreak = 0;
    this.streakStartDate = null;
  }

  /** 주간 카운트가 이번 주가 아니면 리셋 (조회 시 사용) */
  ensureWeeklyCountCurrent(todayKST: string): void {
    const currentWeekStart = getWeekStartKST(todayKST);
    if (this.weekStartDate !== currentWeekStart) {
      this.weeklyCount = 0;
      this.weekStartDate = currentWeekStart;
    }
  }
}
