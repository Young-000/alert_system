import { Injectable, Inject, Logger } from '@nestjs/common';
import {
  SmartDepartureSnapshot,
} from '@domain/entities/smart-departure-snapshot.entity';
import {
  ISmartDepartureSettingRepository,
  SMART_DEPARTURE_SETTING_REPOSITORY,
} from '@domain/repositories/smart-departure-setting.repository';
import {
  ISmartDepartureSnapshotRepository,
  SMART_DEPARTURE_SNAPSHOT_REPOSITORY,
} from '@domain/repositories/smart-departure-snapshot.repository';
import {
  ICommuteRouteRepository,
  COMMUTE_ROUTE_REPOSITORY,
} from '@domain/repositories/commute-route.repository';
import {
  ICommuteSessionRepository,
  COMMUTE_SESSION_REPOSITORY,
} from '@domain/repositories/commute-session.repository';
import {
  SmartDepartureSnapshotResponseDto,
  SmartDepartureTodayResponseDto,
  WidgetDepartureDto,
} from '@application/dto/smart-departure.dto';
import type { SmartDepartureSetting, DepartureType } from '@domain/entities/smart-departure-setting.entity';

const HISTORY_DAYS = 14;
const MIN_HISTORY_RECORDS = 3;
const MIN_TRAVEL_MINUTES = 5;
const MAX_TRAVEL_MINUTES = 120;

// Weighted combination constants
const BASELINE_WEIGHT = 0.2;
const HISTORY_WEIGHT = 0.5;
const REALTIME_WEIGHT = 0.3;

@Injectable()
export class CalculateDepartureUseCase {
  private readonly logger = new Logger(CalculateDepartureUseCase.name);

  constructor(
    @Inject(SMART_DEPARTURE_SETTING_REPOSITORY)
    private readonly settingRepo: ISmartDepartureSettingRepository,
    @Inject(SMART_DEPARTURE_SNAPSHOT_REPOSITORY)
    private readonly snapshotRepo: ISmartDepartureSnapshotRepository,
    @Inject(COMMUTE_ROUTE_REPOSITORY)
    private readonly routeRepo: ICommuteRouteRepository,
    @Inject(COMMUTE_SESSION_REPOSITORY)
    private readonly sessionRepo: ICommuteSessionRepository,
  ) {}

  /**
   * Calculate departure time for all active settings of a user.
   * Creates or updates snapshots for today.
   */
  async calculateForToday(userId: string): Promise<SmartDepartureSnapshotResponseDto[]> {
    const settings = await this.settingRepo.findActiveByUserId(userId);
    const today = this.getTodayDateString();
    const dayOfWeek = new Date().getDay();

    const results: SmartDepartureSnapshotResponseDto[] = [];

    for (const setting of settings) {
      if (!setting.activeDays.includes(dayOfWeek)) continue;

      try {
        const snapshot = await this.calculateForSetting(setting, today);
        results.push(this.toSnapshotDto(snapshot));
      } catch (error) {
        this.logger.error(
          `Failed to calculate departure for setting ${setting.id}: ${error}`,
        );
      }
    }

    return results;
  }

  /**
   * Calculate departure for a single setting on a given date.
   */
  async calculateForSetting(
    setting: SmartDepartureSetting,
    dateStr: string,
  ): Promise<SmartDepartureSnapshot> {
    // 1. Check existing snapshot
    const existing = await this.snapshotRepo.findBySettingAndDate(
      setting.id,
      dateStr,
    );
    if (existing && existing.isDeparted()) {
      return existing;
    }

    // 2. Get route baseline
    const route = await this.routeRepo.findById(setting.routeId);
    const baselineMin = route?.totalExpectedDuration ?? 30;

    // 3. Get history average
    const historyAvgMin = await this.getHistoryAverage(
      setting.userId,
      setting.routeId,
    );

    // 4. Realtime adjustment (placeholder: 0 for now, to be fed by realtime API)
    const realtimeAdj = 0;

    // 5. Estimate travel time
    const estimatedTravelMin = this.estimateTravelTime(
      baselineMin,
      historyAvgMin,
      realtimeAdj,
    );

    // 6. Calculate optimal departure time
    const optimalDepartureAt = this.calculateOptimalDeparture(
      setting.arrivalTarget,
      estimatedTravelMin,
      setting.prepTimeMinutes,
      dateStr,
    );

    // 7. Create or update snapshot
    if (existing) {
      const updated = existing.withUpdatedCalculation({
        estimatedTravelMin,
        optimalDepartureAt,
        realtimeAdjustmentMin: realtimeAdj,
      });
      await this.snapshotRepo.update(updated);
      this.logger.debug(
        `Updated snapshot for setting ${setting.id}: departure at ${optimalDepartureAt.toISOString()}`,
      );
      return updated;
    }

    const snapshot = SmartDepartureSnapshot.create({
      userId: setting.userId,
      settingId: setting.id,
      departureDate: dateStr,
      departureType: setting.departureType,
      arrivalTarget: setting.arrivalTarget,
      estimatedTravelMin,
      prepTimeMinutes: setting.prepTimeMinutes,
      optimalDepartureAt,
      baselineTravelMin: baselineMin,
      historyAvgTravelMin: historyAvgMin,
      realtimeAdjustmentMin: realtimeAdj,
    });

    const saved = await this.snapshotRepo.save(snapshot);
    this.logger.log(
      `Created snapshot for setting ${setting.id}: departure at ${optimalDepartureAt.toISOString()}`,
    );
    return saved;
  }

  /**
   * Get today's departure info for a user (commute + return).
   */
  async getTodayDeparture(userId: string): Promise<SmartDepartureTodayResponseDto> {
    const snapshots = await this.snapshotRepo.findTodayByUserId(userId);
    const response = new SmartDepartureTodayResponseDto();

    for (const snapshot of snapshots) {
      const dto = this.toSnapshotDto(snapshot);
      if (snapshot.departureType === 'commute') {
        response.commute = dto;
      } else {
        response.return = dto;
      }
    }

    return response;
  }

  /**
   * Get widget departure data for a user.
   * Returns the most relevant departure (upcoming or most recent).
   */
  async getWidgetDepartureData(userId: string): Promise<WidgetDepartureDto | null> {
    const snapshots = await this.snapshotRepo.findTodayByUserId(userId);
    if (snapshots.length === 0) return null;

    // Find the next relevant snapshot (scheduled/notified, closest to now)
    const now = new Date();
    const upcoming = snapshots
      .filter((s) => s.status === 'scheduled' || s.status === 'notified')
      .sort(
        (a, b) =>
          a.optimalDepartureAt.getTime() - b.optimalDepartureAt.getTime(),
      );

    const relevant = upcoming.find((s) => s.optimalDepartureAt >= now) ?? upcoming[0];
    if (!relevant) return null;

    const dto = new WidgetDepartureDto();
    dto.departureType = relevant.departureType;
    dto.optimalDepartureAt = relevant.optimalDepartureAt.toISOString();
    dto.minutesUntilDeparture = relevant.getMinutesUntilDeparture();
    dto.estimatedTravelMin = relevant.estimatedTravelMin;
    dto.arrivalTarget = relevant.arrivalTarget;
    dto.status = relevant.status;
    dto.hasTrafficDelay = relevant.realtimeAdjustmentMin > 0;
    return dto;
  }

  /**
   * Weighted combination: baseline 20% + history 50% + realtime 30%.
   * Falls back to baseline + realtime if no history.
   */
  estimateTravelTime(
    baselineMin: number,
    historyAvgMin: number | null,
    realtimeAdjustment: number,
  ): number {
    if (historyAvgMin === null) {
      // No history: baseline + realtime adjustment
      return Math.min(
        Math.max(baselineMin + realtimeAdjustment, MIN_TRAVEL_MINUTES),
        MAX_TRAVEL_MINUTES,
      );
    }

    const weighted =
      baselineMin * BASELINE_WEIGHT +
      historyAvgMin * HISTORY_WEIGHT +
      (historyAvgMin + realtimeAdjustment) * REALTIME_WEIGHT;

    return Math.min(
      Math.max(Math.round(weighted), MIN_TRAVEL_MINUTES),
      MAX_TRAVEL_MINUTES,
    );
  }

  private async getHistoryAverage(
    userId: string,
    routeId: string,
  ): Promise<number | null> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - HISTORY_DAYS);

    const sessions = await this.sessionRepo.findByUserIdInDateRange(
      userId,
      startDate,
      endDate,
    );

    // Filter to completed sessions for the given route
    const relevantSessions = sessions.filter(
      (s) =>
        s.routeId === routeId &&
        s.status === 'completed' &&
        s.totalDurationMinutes !== undefined &&
        s.totalDurationMinutes !== null,
    );

    if (relevantSessions.length < MIN_HISTORY_RECORDS) {
      return null;
    }

    const sum = relevantSessions.reduce(
      (acc, s) => acc + (s.totalDurationMinutes ?? 0),
      0,
    );
    return Math.round(sum / relevantSessions.length);
  }

  private calculateOptimalDeparture(
    arrivalTarget: string,
    estimatedTravelMin: number,
    prepTimeMinutes: number,
    dateStr: string,
  ): Date {
    const [hourStr, minuteStr] = arrivalTarget.split(':');
    const hour = parseInt(hourStr, 10);
    const minute = parseInt(minuteStr, 10);

    // Parse date string
    const [year, month, day] = dateStr.split('-').map(Number);

    // Create arrival target as KST (UTC+9)
    // We build in UTC and offset by -9 hours to represent KST
    const arrivalDate = new Date(
      Date.UTC(year, month - 1, day, hour - 9, minute),
    );

    const totalOffset = (estimatedTravelMin + prepTimeMinutes) * 60_000;
    return new Date(arrivalDate.getTime() - totalOffset);
  }

  private getTodayDateString(): string {
    // Get today's date in KST
    const now = new Date();
    const kst = new Date(now.getTime() + 9 * 60 * 60_000);
    return kst.toISOString().slice(0, 10);
  }

  toSnapshotDto(snapshot: SmartDepartureSnapshot): SmartDepartureSnapshotResponseDto {
    const dto = new SmartDepartureSnapshotResponseDto();
    dto.id = snapshot.id;
    dto.settingId = snapshot.settingId;
    dto.departureType = snapshot.departureType;
    dto.departureDate = snapshot.departureDate;
    dto.arrivalTarget = snapshot.arrivalTarget;
    dto.estimatedTravelMin = snapshot.estimatedTravelMin;
    dto.prepTimeMinutes = snapshot.prepTimeMinutes;
    dto.optimalDepartureAt = snapshot.optimalDepartureAt.toISOString();
    dto.minutesUntilDeparture = snapshot.getMinutesUntilDeparture();
    dto.status = snapshot.status;
    dto.baselineTravelMin = snapshot.baselineTravelMin;
    dto.historyAvgTravelMin = snapshot.historyAvgTravelMin;
    dto.realtimeAdjustmentMin = snapshot.realtimeAdjustmentMin;
    dto.alertsSent = snapshot.alertsSent;
    dto.calculatedAt = snapshot.calculatedAt.toISOString();
    dto.updatedAt = snapshot.updatedAt.toISOString();

    // Compute next alert (smallest preAlert minutes not yet sent)
    // This would need to be computed from the setting's preAlerts, but snapshot alone
    // doesn't have the full preAlerts config. Leave as undefined for now;
    // the controller can enrich this if needed.
    dto.nextAlertMin = undefined;

    return dto;
  }
}
