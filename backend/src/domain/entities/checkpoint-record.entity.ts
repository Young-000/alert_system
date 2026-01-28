export class CheckpointRecord {
  readonly id: string;
  readonly sessionId: string;
  readonly checkpointId: string;
  readonly arrivedAt: Date;
  readonly durationFromPrevious?: number;
  readonly actualWaitTime: number;
  readonly isDelayed: boolean;
  readonly delayMinutes: number;
  readonly waitDelayMinutes: number;
  readonly notes?: string;
  readonly createdAt: Date;

  constructor(
    sessionId: string,
    checkpointId: string,
    arrivedAt: Date,
    options?: {
      id?: string;
      durationFromPrevious?: number;
      actualWaitTime?: number;
      isDelayed?: boolean;
      delayMinutes?: number;
      waitDelayMinutes?: number;
      notes?: string;
      createdAt?: Date;
    }
  ) {
    this.id = options?.id || '';
    this.sessionId = sessionId;
    this.checkpointId = checkpointId;
    this.arrivedAt = arrivedAt;
    this.durationFromPrevious = options?.durationFromPrevious;
    this.actualWaitTime = options?.actualWaitTime ?? 0;
    this.isDelayed = options?.isDelayed ?? false;
    this.delayMinutes = options?.delayMinutes ?? 0;
    this.waitDelayMinutes = options?.waitDelayMinutes ?? 0;
    this.notes = options?.notes;
    this.createdAt = options?.createdAt || new Date();
  }

  // 이전 체크포인트 기록을 기반으로 새 기록 생성
  static create(
    sessionId: string,
    checkpointId: string,
    expectedDuration: number,
    expectedWaitTime: number,
    previousRecord?: CheckpointRecord,
    options?: {
      actualWaitTime?: number;
      notes?: string;
    }
  ): CheckpointRecord {
    const now = new Date();

    // 이전 기록이 있으면 소요 시간 계산
    let durationFromPrevious: number | undefined;
    if (previousRecord) {
      durationFromPrevious = Math.round(
        (now.getTime() - previousRecord.arrivedAt.getTime()) / (1000 * 60)
      );
    }

    // 지연 시간 계산
    const actualWaitTime = options?.actualWaitTime ?? 0;
    const totalActual = (durationFromPrevious || 0) + actualWaitTime;
    const totalExpected = expectedDuration + expectedWaitTime;
    const delayMinutes = totalActual - totalExpected;
    const waitDelayMinutes = actualWaitTime - expectedWaitTime;
    const isDelayed = delayMinutes > 0;

    return new CheckpointRecord(sessionId, checkpointId, now, {
      durationFromPrevious,
      actualWaitTime,
      isDelayed,
      delayMinutes,
      waitDelayMinutes,
      notes: options?.notes,
    });
  }

  // 도착 시간 포맷 (HH:mm)
  getArrivalTimeString(): string {
    const hours = this.arrivedAt.getHours().toString().padStart(2, '0');
    const minutes = this.arrivedAt.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  // 지연 상태 텍스트
  getDelayStatus(): string {
    if (this.delayMinutes === 0) return '정시';
    if (this.delayMinutes > 0) return `+${this.delayMinutes}분`;
    return `${this.delayMinutes}분`;
  }

  // 대기 시간 지연 상태 텍스트
  getWaitDelayStatus(): string {
    if (this.waitDelayMinutes === 0) return '예상대로';
    if (this.waitDelayMinutes > 0) return `+${this.waitDelayMinutes}분 대기`;
    return `${Math.abs(this.waitDelayMinutes)}분 빨리 탑승`;
  }

  // 총 소요 시간 (이동 + 대기)
  getTotalDuration(): number {
    return (this.durationFromPrevious || 0) + this.actualWaitTime;
  }
}
