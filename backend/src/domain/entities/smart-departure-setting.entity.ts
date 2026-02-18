export type DepartureType = 'commute' | 'return';

export class SmartDepartureSetting {
  readonly id: string;
  readonly userId: string;
  readonly routeId: string;
  readonly departureType: DepartureType;
  readonly arrivalTarget: string; // 'HH:mm' format
  readonly prepTimeMinutes: number;
  readonly isEnabled: boolean;
  readonly activeDays: number[]; // 0=Sun, 1=Mon, ..., 6=Sat
  readonly preAlerts: number[]; // minutes before departure: [30, 10, 0]
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(
    userId: string,
    routeId: string,
    departureType: DepartureType,
    arrivalTarget: string,
    options?: {
      id?: string;
      prepTimeMinutes?: number;
      isEnabled?: boolean;
      activeDays?: number[];
      preAlerts?: number[];
      createdAt?: Date;
      updatedAt?: Date;
    },
  ) {
    this.id = options?.id || '';
    this.userId = userId;
    this.routeId = routeId;
    this.departureType = departureType;
    this.arrivalTarget = arrivalTarget;
    this.prepTimeMinutes = options?.prepTimeMinutes ?? 30;
    this.isEnabled = options?.isEnabled ?? true;
    this.activeDays = options?.activeDays ?? [1, 2, 3, 4, 5];
    this.preAlerts = options?.preAlerts ?? [30, 10, 0];
    this.createdAt = options?.createdAt || new Date();
    this.updatedAt = options?.updatedAt || new Date();
  }

  static create(
    userId: string,
    routeId: string,
    departureType: DepartureType,
    arrivalTarget: string,
    options?: {
      prepTimeMinutes?: number;
      activeDays?: number[];
      preAlerts?: number[];
    },
  ): SmartDepartureSetting {
    const setting = new SmartDepartureSetting(
      userId,
      routeId,
      departureType,
      arrivalTarget,
      {
        prepTimeMinutes: options?.prepTimeMinutes ?? 30,
        isEnabled: true,
        activeDays: options?.activeDays ?? [1, 2, 3, 4, 5],
        preAlerts: options?.preAlerts ?? [30, 10, 0],
      },
    );

    if (!setting.isValidArrivalTarget()) {
      throw new Error(`Invalid arrivalTarget format: ${arrivalTarget}. Must be HH:mm`);
    }
    if (!setting.isValidPrepTime()) {
      throw new Error(
        `Invalid prepTimeMinutes: ${setting.prepTimeMinutes}. Must be 10-60`,
      );
    }
    if (!setting.isValidActiveDays()) {
      throw new Error(`Invalid activeDays: ${JSON.stringify(setting.activeDays)}. Values must be 0-6`);
    }

    return setting;
  }

  withUpdatedFields(fields: {
    routeId?: string;
    arrivalTarget?: string;
    prepTimeMinutes?: number;
    activeDays?: number[];
    preAlerts?: number[];
  }): SmartDepartureSetting {
    return new SmartDepartureSetting(
      this.userId,
      fields.routeId ?? this.routeId,
      this.departureType,
      fields.arrivalTarget ?? this.arrivalTarget,
      {
        id: this.id,
        prepTimeMinutes: fields.prepTimeMinutes ?? this.prepTimeMinutes,
        isEnabled: this.isEnabled,
        activeDays: fields.activeDays ?? this.activeDays,
        preAlerts: fields.preAlerts ?? this.preAlerts,
        createdAt: this.createdAt,
        updatedAt: new Date(),
      },
    );
  }

  toggleEnabled(): SmartDepartureSetting {
    return new SmartDepartureSetting(
      this.userId,
      this.routeId,
      this.departureType,
      this.arrivalTarget,
      {
        id: this.id,
        prepTimeMinutes: this.prepTimeMinutes,
        isEnabled: !this.isEnabled,
        activeDays: this.activeDays,
        preAlerts: this.preAlerts,
        createdAt: this.createdAt,
        updatedAt: new Date(),
      },
    );
  }

  isActiveToday(): boolean {
    if (!this.isEnabled) return false;
    const dayOfWeek = new Date().getDay();
    return this.activeDays.includes(dayOfWeek);
  }

  isValidArrivalTarget(): boolean {
    return /^\d{2}:\d{2}$/.test(this.arrivalTarget) &&
      (() => {
        const [h, m] = this.arrivalTarget.split(':').map(Number);
        return h >= 0 && h <= 23 && m >= 0 && m <= 59;
      })();
  }

  isValidPrepTime(): boolean {
    return this.prepTimeMinutes >= 10 && this.prepTimeMinutes <= 60;
  }

  isValidActiveDays(): boolean {
    return this.activeDays.length > 0 &&
      this.activeDays.every((d) => d >= 0 && d <= 6);
  }
}
