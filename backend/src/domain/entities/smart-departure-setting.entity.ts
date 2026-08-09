import { getDayOfWeekKST } from '@domain/utils/kst-date';

export type DepartureType = 'commute' | 'return';

/**
 * 설정값이 도메인 규칙을 벗어났을 때 던진다.
 * 사용자 입력 오류이므로 use-case에서 400으로 옮긴다 (서버 오류가 아니다).
 */
export class InvalidSmartDepartureSettingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidSmartDepartureSettingError';
  }
}

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

    setting.assertValid();

    return setting;
  }

  /**
   * 저장 가능한 상태인지 확인한다.
   *
   * 생성과 수정이 같은 규칙을 쓰게 하려고 한곳에 모았다 — 한쪽만 검사하면
   * 수정 경로로 무효한 값이 들어가 출발시각 계산이 조용히 어긋난다.
   * 생성자에서는 부르지 않는다: 저장소가 DB 행을 복원할 때도 지나가는 길이다.
   */
  private assertValid(): void {
    if (!this.isValidArrivalTarget()) {
      throw new InvalidSmartDepartureSettingError(
        `Invalid arrivalTarget: ${this.arrivalTarget}. Must be HH:mm within 00:00-23:59`,
      );
    }
    if (!this.isValidPrepTime()) {
      throw new InvalidSmartDepartureSettingError(
        `Invalid prepTimeMinutes: ${this.prepTimeMinutes}. Must be 10-60`,
      );
    }
    if (!this.isValidActiveDays()) {
      throw new InvalidSmartDepartureSettingError(
        `Invalid activeDays: ${JSON.stringify(this.activeDays)}. Values must be 0-6`,
      );
    }
  }

  withUpdatedFields(fields: {
    routeId?: string;
    arrivalTarget?: string;
    prepTimeMinutes?: number;
    activeDays?: number[];
    preAlerts?: number[];
  }): SmartDepartureSetting {
    const updated = new SmartDepartureSetting(
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

    updated.assertValid();

    return updated;
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
    const dayOfWeek = getDayOfWeekKST();
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
