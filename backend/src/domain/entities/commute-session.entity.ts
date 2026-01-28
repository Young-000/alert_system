import { CheckpointRecord } from './checkpoint-record.entity';

export enum SessionStatus {
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export class CommuteSession {
  readonly id: string;
  readonly userId: string;
  readonly routeId: string;
  readonly startedAt: Date;
  readonly completedAt?: Date;
  readonly totalDurationMinutes?: number;
  readonly totalWaitMinutes: number;
  readonly totalDelayMinutes: number;
  readonly status: SessionStatus;
  readonly weatherCondition?: string;
  readonly notes?: string;
  readonly checkpointRecords: CheckpointRecord[];
  readonly createdAt: Date;

  constructor(
    userId: string,
    routeId: string,
    options?: {
      id?: string;
      startedAt?: Date;
      completedAt?: Date;
      totalDurationMinutes?: number;
      totalWaitMinutes?: number;
      totalDelayMinutes?: number;
      status?: SessionStatus;
      weatherCondition?: string;
      notes?: string;
      checkpointRecords?: CheckpointRecord[];
      createdAt?: Date;
    }
  ) {
    this.id = options?.id || '';
    this.userId = userId;
    this.routeId = routeId;
    this.startedAt = options?.startedAt || new Date();
    this.completedAt = options?.completedAt;
    this.totalDurationMinutes = options?.totalDurationMinutes;
    this.totalWaitMinutes = options?.totalWaitMinutes ?? 0;
    this.totalDelayMinutes = options?.totalDelayMinutes ?? 0;
    this.status = options?.status || SessionStatus.IN_PROGRESS;
    this.weatherCondition = options?.weatherCondition;
    this.notes = options?.notes;
    this.checkpointRecords = options?.checkpointRecords || [];
    this.createdAt = options?.createdAt || new Date();
  }

  static start(userId: string, routeId: string, weatherCondition?: string): CommuteSession {
    return new CommuteSession(userId, routeId, {
      startedAt: new Date(),
      status: SessionStatus.IN_PROGRESS,
      weatherCondition,
    });
  }

  // 세션 완료 시 통계 계산
  complete(): CommuteSession {
    const now = new Date();
    const totalDurationMinutes = Math.round(
      (now.getTime() - this.startedAt.getTime()) / (1000 * 60)
    );

    // 체크포인트 기록에서 대기 시간과 지연 시간 총합 계산
    const totalWaitMinutes = this.checkpointRecords.reduce(
      (sum, record) => sum + record.actualWaitTime,
      0
    );
    const totalDelayMinutes = this.checkpointRecords.reduce(
      (sum, record) => sum + record.delayMinutes,
      0
    );

    return new CommuteSession(this.userId, this.routeId, {
      id: this.id,
      startedAt: this.startedAt,
      completedAt: now,
      totalDurationMinutes,
      totalWaitMinutes,
      totalDelayMinutes,
      status: SessionStatus.COMPLETED,
      weatherCondition: this.weatherCondition,
      notes: this.notes,
      checkpointRecords: this.checkpointRecords,
      createdAt: this.createdAt,
    });
  }

  // 통근 진행률 (%)
  getProgress(totalCheckpoints: number): number {
    if (totalCheckpoints === 0) return 0;
    return Math.round((this.checkpointRecords.length / totalCheckpoints) * 100);
  }

  // 예상 대비 지연 상태 텍스트
  getDelayStatus(): string {
    if (this.totalDelayMinutes === 0) return '정시';
    if (this.totalDelayMinutes > 0) return `${this.totalDelayMinutes}분 지연`;
    return `${Math.abs(this.totalDelayMinutes)}분 빠름`;
  }

  // 순수 이동 시간 (대기 시간 제외)
  getPureMovementTime(): number {
    if (!this.totalDurationMinutes) return 0;
    return this.totalDurationMinutes - this.totalWaitMinutes;
  }

  // 환승/대기 시간 비율 (%)
  getWaitTimePercentage(): number {
    if (!this.totalDurationMinutes || this.totalDurationMinutes === 0) return 0;
    return Math.round((this.totalWaitMinutes / this.totalDurationMinutes) * 100);
  }

  // 가장 오래 걸린 구간 찾기
  getLongestSegment(): CheckpointRecord | undefined {
    if (this.checkpointRecords.length === 0) return undefined;
    return this.checkpointRecords.reduce((longest, current) =>
      (current.durationFromPrevious || 0) > (longest.durationFromPrevious || 0) ? current : longest
    );
  }

  // 가장 많이 지연된 구간 찾기
  getMostDelayedSegment(): CheckpointRecord | undefined {
    if (this.checkpointRecords.length === 0) return undefined;
    return this.checkpointRecords.reduce((mostDelayed, current) =>
      current.delayMinutes > mostDelayed.delayMinutes ? current : mostDelayed
    );
  }
}
