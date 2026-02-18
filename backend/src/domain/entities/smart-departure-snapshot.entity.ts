import type { DepartureType } from './smart-departure-setting.entity';

export type SnapshotStatus = 'scheduled' | 'notified' | 'departed' | 'cancelled' | 'expired';

export class SmartDepartureSnapshot {
  readonly id: string;
  readonly userId: string;
  readonly settingId: string;
  readonly departureDate: string; // 'YYYY-MM-DD'
  readonly departureType: DepartureType;
  readonly arrivalTarget: string; // 'HH:mm'
  readonly estimatedTravelMin: number;
  readonly prepTimeMinutes: number;
  readonly optimalDepartureAt: Date;
  readonly baselineTravelMin: number | null;
  readonly historyAvgTravelMin: number | null;
  readonly realtimeAdjustmentMin: number;
  readonly status: SnapshotStatus;
  readonly alertsSent: number[];
  readonly departedAt: Date | null;
  readonly scheduleIds: string[];
  readonly calculatedAt: Date;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(
    userId: string,
    settingId: string,
    departureDate: string,
    departureType: DepartureType,
    arrivalTarget: string,
    estimatedTravelMin: number,
    prepTimeMinutes: number,
    optimalDepartureAt: Date,
    options?: {
      id?: string;
      baselineTravelMin?: number | null;
      historyAvgTravelMin?: number | null;
      realtimeAdjustmentMin?: number;
      status?: SnapshotStatus;
      alertsSent?: number[];
      departedAt?: Date | null;
      scheduleIds?: string[];
      calculatedAt?: Date;
      createdAt?: Date;
      updatedAt?: Date;
    },
  ) {
    this.id = options?.id || '';
    this.userId = userId;
    this.settingId = settingId;
    this.departureDate = departureDate;
    this.departureType = departureType;
    this.arrivalTarget = arrivalTarget;
    this.estimatedTravelMin = estimatedTravelMin;
    this.prepTimeMinutes = prepTimeMinutes;
    this.optimalDepartureAt = optimalDepartureAt;
    this.baselineTravelMin = options?.baselineTravelMin ?? null;
    this.historyAvgTravelMin = options?.historyAvgTravelMin ?? null;
    this.realtimeAdjustmentMin = options?.realtimeAdjustmentMin ?? 0;
    this.status = options?.status ?? 'scheduled';
    this.alertsSent = options?.alertsSent ?? [];
    this.departedAt = options?.departedAt ?? null;
    this.scheduleIds = options?.scheduleIds ?? [];
    this.calculatedAt = options?.calculatedAt || new Date();
    this.createdAt = options?.createdAt || new Date();
    this.updatedAt = options?.updatedAt || new Date();
  }

  static create(params: {
    userId: string;
    settingId: string;
    departureDate: string;
    departureType: DepartureType;
    arrivalTarget: string;
    estimatedTravelMin: number;
    prepTimeMinutes: number;
    optimalDepartureAt: Date;
    baselineTravelMin?: number | null;
    historyAvgTravelMin?: number | null;
    realtimeAdjustmentMin?: number;
  }): SmartDepartureSnapshot {
    return new SmartDepartureSnapshot(
      params.userId,
      params.settingId,
      params.departureDate,
      params.departureType,
      params.arrivalTarget,
      params.estimatedTravelMin,
      params.prepTimeMinutes,
      params.optimalDepartureAt,
      {
        baselineTravelMin: params.baselineTravelMin,
        historyAvgTravelMin: params.historyAvgTravelMin,
        realtimeAdjustmentMin: params.realtimeAdjustmentMin ?? 0,
        status: 'scheduled',
      },
    );
  }

  withUpdatedCalculation(params: {
    estimatedTravelMin: number;
    optimalDepartureAt: Date;
    realtimeAdjustmentMin: number;
  }): SmartDepartureSnapshot {
    return new SmartDepartureSnapshot(
      this.userId,
      this.settingId,
      this.departureDate,
      this.departureType,
      this.arrivalTarget,
      params.estimatedTravelMin,
      this.prepTimeMinutes,
      params.optimalDepartureAt,
      {
        id: this.id,
        baselineTravelMin: this.baselineTravelMin,
        historyAvgTravelMin: this.historyAvgTravelMin,
        realtimeAdjustmentMin: params.realtimeAdjustmentMin,
        status: this.status,
        alertsSent: this.alertsSent,
        departedAt: this.departedAt,
        scheduleIds: this.scheduleIds,
        calculatedAt: new Date(),
        createdAt: this.createdAt,
        updatedAt: new Date(),
      },
    );
  }

  withStatus(status: SnapshotStatus): SmartDepartureSnapshot {
    return new SmartDepartureSnapshot(
      this.userId,
      this.settingId,
      this.departureDate,
      this.departureType,
      this.arrivalTarget,
      this.estimatedTravelMin,
      this.prepTimeMinutes,
      this.optimalDepartureAt,
      {
        id: this.id,
        baselineTravelMin: this.baselineTravelMin,
        historyAvgTravelMin: this.historyAvgTravelMin,
        realtimeAdjustmentMin: this.realtimeAdjustmentMin,
        status,
        alertsSent: this.alertsSent,
        departedAt: status === 'departed' ? new Date() : this.departedAt,
        scheduleIds: this.scheduleIds,
        calculatedAt: this.calculatedAt,
        createdAt: this.createdAt,
        updatedAt: new Date(),
      },
    );
  }

  withAlertSent(alertMinutes: number): SmartDepartureSnapshot {
    const newAlertsSent = [...this.alertsSent, alertMinutes];
    return new SmartDepartureSnapshot(
      this.userId,
      this.settingId,
      this.departureDate,
      this.departureType,
      this.arrivalTarget,
      this.estimatedTravelMin,
      this.prepTimeMinutes,
      this.optimalDepartureAt,
      {
        id: this.id,
        baselineTravelMin: this.baselineTravelMin,
        historyAvgTravelMin: this.historyAvgTravelMin,
        realtimeAdjustmentMin: this.realtimeAdjustmentMin,
        status: 'notified',
        alertsSent: newAlertsSent,
        departedAt: this.departedAt,
        scheduleIds: this.scheduleIds,
        calculatedAt: this.calculatedAt,
        createdAt: this.createdAt,
        updatedAt: new Date(),
      },
    );
  }

  withScheduleIds(scheduleIds: string[]): SmartDepartureSnapshot {
    return new SmartDepartureSnapshot(
      this.userId,
      this.settingId,
      this.departureDate,
      this.departureType,
      this.arrivalTarget,
      this.estimatedTravelMin,
      this.prepTimeMinutes,
      this.optimalDepartureAt,
      {
        id: this.id,
        baselineTravelMin: this.baselineTravelMin,
        historyAvgTravelMin: this.historyAvgTravelMin,
        realtimeAdjustmentMin: this.realtimeAdjustmentMin,
        status: this.status,
        alertsSent: this.alertsSent,
        departedAt: this.departedAt,
        scheduleIds,
        calculatedAt: this.calculatedAt,
        createdAt: this.createdAt,
        updatedAt: new Date(),
      },
    );
  }

  getMinutesUntilDeparture(): number {
    const now = new Date();
    return Math.round(
      (this.optimalDepartureAt.getTime() - now.getTime()) / 60_000,
    );
  }

  isExpired(): boolean {
    return this.status === 'expired' || this.status === 'cancelled';
  }

  isDeparted(): boolean {
    return this.status === 'departed';
  }
}
