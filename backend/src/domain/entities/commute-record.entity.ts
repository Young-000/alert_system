import { formatTimeKST, getHoursKST, toDateOnlyKST } from '@domain/utils/kst-date';

export enum CommuteType {
  MORNING = 'morning',
  EVENING = 'evening',
}

export class CommuteRecord {
  readonly id: string;
  readonly userId: string;
  readonly alertId?: string;
  /**
   * 출퇴근 날짜 (KST 달력 날짜, 'YYYY-MM-DD').
   *
   * DB 컬럼이 `date`(날짜 전용)이므로 시각·타임존 개념이 없다. TypeORM도 이 컬럼을
   * 문자열로 hydrate하므로 문자열이 런타임 실제 타입이다. 프로젝트의 다른 날짜 전용
   * 필드(`SmartDepartureSnapshot.departureDate`, `StreakDailyLog.recordDate`)와 같은 표현이다.
   */
  readonly commuteDate: string;
  readonly commuteType: CommuteType;
  readonly scheduledDeparture?: string;  // TIME format "HH:mm"
  readonly actualDeparture?: Date;
  readonly weatherCondition?: string;
  readonly transitDelayMinutes?: number;
  readonly notes?: string;
  readonly createdAt: Date;

  constructor(
    userId: string,
    commuteDate: Date | string,
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
    this.commuteDate = toDateOnlyKST(commuteDate);
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
    // 서버 TZ는 UTC이므로 getHours()는 KST 오전/오후를 잘못 판정한다 (KST 07:00 = UTC 22:00 전날).
    const hour = getHoursKST(now);
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
    // 사용자에게 보여줄 시각 — 서버 TZ가 UTC여도 KST로 표기한다.
    return formatTimeKST(this.actualDeparture);
  }
}
