export class StreakDailyLog {
  readonly id: string;
  readonly userId: string;
  readonly recordDate: string; // YYYY-MM-DD (KST 기준)
  readonly sessionId: string;
  readonly createdAt: Date;

  constructor(
    userId: string,
    recordDate: string,
    sessionId: string,
    options?: {
      id?: string;
      createdAt?: Date;
    },
  ) {
    this.id = options?.id ?? '';
    this.userId = userId;
    this.recordDate = recordDate;
    this.sessionId = sessionId;
    this.createdAt = options?.createdAt ?? new Date();
  }

  static create(userId: string, recordDate: string, sessionId: string): StreakDailyLog {
    return new StreakDailyLog(userId, recordDate, sessionId);
  }
}
