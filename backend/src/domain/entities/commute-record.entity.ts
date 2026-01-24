export enum CommuteType {
  MORNING = 'morning',
  EVENING = 'evening',
}

export class CommuteRecord {
  readonly id: string;
  readonly userId: string;
  readonly alertId?: string;
  readonly commuteDate: Date;
  readonly commuteType: CommuteType;
  readonly scheduledDeparture?: string;  // TIME format "HH:mm"
  readonly actualDeparture?: Date;
  readonly weatherCondition?: string;
  readonly transitDelayMinutes?: number;
  readonly notes?: string;
  readonly createdAt: Date;

  constructor(
    userId: string,
    commuteDate: Date,
    commuteType: CommuteType,
    options?: {
      id?: string;
      alertId?: string;
      scheduledDeparture?: string;
      actualDeparture?: Date;
      weatherCondition?: string;
      transitDelayMinutes?: number;
      notes?: string;
      createdAt?: Date;
    }
  ) {
    this.id = options?.id || '';
    this.userId = userId;
    this.commuteDate = commuteDate;
    this.commuteType = commuteType;
    this.alertId = options?.alertId;
    this.scheduledDeparture = options?.scheduledDeparture;
    this.actualDeparture = options?.actualDeparture;
    this.weatherCondition = options?.weatherCondition;
    this.transitDelayMinutes = options?.transitDelayMinutes;
    this.notes = options?.notes;
    this.createdAt = options?.createdAt || new Date();
  }

  static createFromDepartureConfirmation(
    userId: string,
    alertId: string,
    weatherCondition?: string,
    transitDelayMinutes?: number
  ): CommuteRecord {
    const now = new Date();
    const hour = now.getHours();
    const commuteType = hour < 12 ? CommuteType.MORNING : CommuteType.EVENING;

    return new CommuteRecord(userId, now, commuteType, {
      alertId,
      actualDeparture: now,
      weatherCondition,
      transitDelayMinutes,
    });
  }

  getActualDepartureTime(): string | undefined {
    if (!this.actualDeparture) return undefined;
    const hours = this.actualDeparture.getHours().toString().padStart(2, '0');
    const minutes = this.actualDeparture.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }
}
