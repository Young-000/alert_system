import { Injectable } from '@nestjs/common';
import { CommuteRecord } from '@domain/entities/commute-record.entity';
import { CommuteSession } from '@domain/entities/commute-session.entity';
import { timeToMinutes } from './statistics/descriptive-stats';

/**
 * Features extracted per commute record for regression analysis.
 */
export interface DayFeatures {
  dayOfWeek: number;    // 0-6
  isWeekday: boolean;
  isMonday: boolean;
  isFriday: boolean;
}

export interface WeatherFeatures {
  isRaining: boolean;
  isSnowing: boolean;
  temperatureDeviation: number; // degrees from 15C (comfortable baseline)
}

export interface SessionFeatures {
  totalDurationMinutes: number;
  totalWaitMinutes: number;
  totalDelayMinutes: number;
  segmentCount: number;
}

/**
 * Combined feature row for regression — one per commute record.
 */
export interface CommuteFeatureRow {
  departureMinutes: number;     // target variable: actual departure in minutes since midnight
  dayOfWeek: number;
  isWeekday: number;            // 0 or 1
  isRaining: number;            // 0 or 1
  isSnowing: number;            // 0 or 1
  temperatureDeviation: number;
  commuteDate: Date;
}

@Injectable()
export class FeatureEngineeringService {
  /**
   * Extract day-of-week features from a Date.
   */
  extractDayFeatures(date: Date): DayFeatures {
    const dayOfWeek = date.getDay();
    return {
      dayOfWeek,
      isWeekday: dayOfWeek >= 1 && dayOfWeek <= 5,
      isMonday: dayOfWeek === 1,
      isFriday: dayOfWeek === 5,
    };
  }

  /**
   * Extract weather features from a weather condition string.
   */
  extractWeatherFeatures(
    weatherCondition?: string,
    temperature?: number,
  ): WeatherFeatures {
    const condition = (weatherCondition ?? '').toLowerCase();
    const comfortableTemp = 15;

    return {
      isRaining: condition.includes('rain') || condition.includes('비'),
      isSnowing: condition.includes('snow') || condition.includes('눈'),
      temperatureDeviation: temperature !== undefined
        ? temperature - comfortableTemp
        : 0,
    };
  }

  /**
   * Extract session-level features from a CommuteSession.
   */
  extractSessionFeatures(session: CommuteSession): SessionFeatures {
    return {
      totalDurationMinutes: session.totalDurationMinutes ?? 0,
      totalWaitMinutes: session.totalWaitMinutes,
      totalDelayMinutes: session.totalDelayMinutes,
      segmentCount: session.checkpointRecords.length,
    };
  }

  /**
   * Transform a set of CommuteRecords into feature rows for regression.
   * Filters out records without actual departure times.
   */
  transformRecordsToFeatureRows(records: readonly CommuteRecord[]): CommuteFeatureRow[] {
    return records
      .filter(r => r.actualDeparture)
      .map(r => {
        const departureTime = r.getActualDepartureTime()!;
        const dayFeatures = this.extractDayFeatures(r.commuteDate);
        const weatherFeatures = this.extractWeatherFeatures(r.weatherCondition);

        return {
          departureMinutes: timeToMinutes(departureTime),
          dayOfWeek: dayFeatures.dayOfWeek,
          isWeekday: dayFeatures.isWeekday ? 1 : 0,
          isRaining: weatherFeatures.isRaining ? 1 : 0,
          isSnowing: weatherFeatures.isSnowing ? 1 : 0,
          temperatureDeviation: weatherFeatures.temperatureDeviation,
          commuteDate: r.commuteDate,
        };
      });
  }

  /**
   * Group feature rows by day of week.
   */
  groupByDayOfWeek(rows: readonly CommuteFeatureRow[]): Map<number, CommuteFeatureRow[]> {
    const groups = new Map<number, CommuteFeatureRow[]>();
    for (const row of rows) {
      const existing = groups.get(row.dayOfWeek) ?? [];
      existing.push(row);
      groups.set(row.dayOfWeek, existing);
    }
    return groups;
  }

  /**
   * Build a weather feature matrix X and departure deviation vector Y
   * for linear regression. Deviation is from the user's overall mean.
   */
  buildWeatherRegressionData(
    rows: readonly CommuteFeatureRow[],
    overallMean: number,
  ): { X: number[][]; Y: number[] } {
    const X: number[][] = [];
    const Y: number[] = [];

    for (const row of rows) {
      X.push([row.isRaining, row.isSnowing, row.temperatureDeviation]);
      Y.push(row.departureMinutes - overallMean);
    }

    return { X, Y };
  }

  /**
   * Count distinct weather conditions in the dataset.
   */
  countWeatherVariety(rows: readonly CommuteFeatureRow[]): {
    rainCount: number;
    snowCount: number;
    clearCount: number;
    totalDistinctConditions: number;
  } {
    let rainCount = 0;
    let snowCount = 0;
    let clearCount = 0;

    for (const row of rows) {
      if (row.isSnowing) snowCount++;
      else if (row.isRaining) rainCount++;
      else clearCount++;
    }

    const distinctConditions = [rainCount > 0, snowCount > 0, clearCount > 0]
      .filter(Boolean).length;

    return {
      rainCount,
      snowCount,
      clearCount,
      totalDistinctConditions: distinctConditions,
    };
  }
}
