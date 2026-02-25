import { v4 as uuidv4 } from 'uuid';

type DailyMissionRecordOptions = {
  id?: string;
  userId: string;
  missionId: string;
  date: string; // YYYY-MM-DD (KST)
  isCompleted?: boolean;
  completedAt?: Date | null;
  createdAt?: Date;
};

export class DailyMissionRecord {
  id: string;
  userId: string;
  missionId: string;
  date: string;
  isCompleted: boolean;
  completedAt: Date | null;
  createdAt: Date;

  constructor(options: DailyMissionRecordOptions) {
    this.id = options.id ?? uuidv4();
    this.userId = options.userId;
    this.missionId = options.missionId;
    this.date = options.date;
    this.isCompleted = options.isCompleted ?? false;
    this.completedAt = options.completedAt ?? null;
    this.createdAt = options.createdAt ?? new Date();
  }

  static createForToday(userId: string, missionId: string, todayKST: string): DailyMissionRecord {
    return new DailyMissionRecord({ userId, missionId, date: todayKST });
  }

  toggleCheck(): void {
    this.isCompleted = !this.isCompleted;
    this.completedAt = this.isCompleted ? new Date() : null;
  }
}
