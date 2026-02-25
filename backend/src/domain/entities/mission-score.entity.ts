import { v4 as uuidv4 } from 'uuid';

type MissionScoreOptions = {
  id?: string;
  userId: string;
  date: string;
  totalMissions: number;
  completedMissions: number;
  completionRate: number;
  streakDay: number;
  createdAt?: Date;
};

export class MissionScore {
  id: string;
  userId: string;
  date: string;
  totalMissions: number;
  completedMissions: number;
  completionRate: number;
  streakDay: number;
  createdAt: Date;

  constructor(options: MissionScoreOptions) {
    this.id = options.id ?? uuidv4();
    this.userId = options.userId;
    this.date = options.date;
    this.totalMissions = options.totalMissions;
    this.completedMissions = options.completedMissions;
    this.completionRate = options.completionRate;
    this.streakDay = options.streakDay;
    this.createdAt = options.createdAt ?? new Date();
  }

  static calculate(
    userId: string,
    date: string,
    totalMissions: number,
    completedMissions: number,
    previousStreakDay: number,
  ): MissionScore {
    const completionRate =
      totalMissions === 0 ? 0 : Math.round((completedMissions / totalMissions) * 100);
    const streakDay =
      completionRate === 100 ? previousStreakDay + 1 : 0;

    return new MissionScore({
      userId,
      date,
      totalMissions,
      completedMissions,
      completionRate,
      streakDay,
    });
  }

  isPerfect(): boolean {
    return this.completionRate === 100;
  }
}
