export type TrendDirection = 'improving' | 'stable' | 'worsening';

const MINIMUM_USERS = 5;
const STALE_THRESHOLD_DAYS = 30;

/**
 * Peak hour distribution: a 24-slot histogram [0..23] mapping hour -> session count.
 */
export type PeakHourDistribution = Record<number, number>;

/**
 * Generate a region ID from grid coordinates.
 * Format: "grid_{lat}_{lng}" with 2 decimal places.
 */
export function toRegionId(gridLat: number, gridLng: number): string {
  return `grid_${gridLat.toFixed(2)}_${gridLng.toFixed(2)}`;
}

/**
 * Snap a coordinate to grid cell center (0.01-degree grid ~ 1km).
 * Floor to nearest 0.01, then add 0.005 for cell center.
 */
export function snapToGrid(value: number): number {
  return Math.floor(value * 100) / 100 + 0.005;
}

/**
 * Classify trend direction based on percentage change.
 * >3% increase -> worsening (longer commutes)
 * <-3% decrease -> improving (shorter commutes)
 * otherwise -> stable
 */
export function classifyTrend(percentChange: number): TrendDirection {
  if (percentChange > 3) return 'worsening';
  if (percentChange < -3) return 'improving';
  return 'stable';
}

export class RegionalInsight {
  readonly id: string;
  readonly regionId: string;
  readonly regionName: string;
  readonly gridLat: number;
  readonly gridLng: number;
  readonly avgDurationMinutes: number;
  readonly medianDurationMinutes: number;
  readonly userCount: number;
  readonly sessionCount: number;
  readonly peakHourDistribution: PeakHourDistribution;
  readonly weekTrend: number;
  readonly monthTrend: number;
  readonly lastCalculatedAt: Date;
  readonly createdAt: Date;

  constructor(options: {
    id?: string;
    regionId: string;
    regionName: string;
    gridLat: number;
    gridLng: number;
    avgDurationMinutes: number;
    medianDurationMinutes: number;
    userCount: number;
    sessionCount: number;
    peakHourDistribution: PeakHourDistribution;
    weekTrend: number;
    monthTrend: number;
    lastCalculatedAt?: Date;
    createdAt?: Date;
  }) {
    this.id = options.id || '';
    this.regionId = options.regionId;
    this.regionName = options.regionName;
    this.gridLat = options.gridLat;
    this.gridLng = options.gridLng;
    this.avgDurationMinutes = options.avgDurationMinutes;
    this.medianDurationMinutes = options.medianDurationMinutes;
    this.userCount = options.userCount;
    this.sessionCount = options.sessionCount;
    this.peakHourDistribution = options.peakHourDistribution;
    this.weekTrend = options.weekTrend;
    this.monthTrend = options.monthTrend;
    this.lastCalculatedAt = options.lastCalculatedAt || new Date();
    this.createdAt = options.createdAt || new Date();
  }

  /**
   * Check if this region has enough distinct users to display (privacy threshold).
   */
  meetsPrivacyThreshold(): boolean {
    return this.userCount >= MINIMUM_USERS;
  }

  /**
   * Check if this insight data is stale (>30 days old).
   */
  isStale(): boolean {
    const daysSinceUpdate =
      (Date.now() - this.lastCalculatedAt.getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceUpdate > STALE_THRESHOLD_DAYS;
  }

  /**
   * Get week-over-week trend direction.
   */
  getWeekTrendDirection(): TrendDirection {
    return classifyTrend(this.weekTrend);
  }

  /**
   * Get month-over-month trend direction.
   */
  getMonthTrendDirection(): TrendDirection {
    return classifyTrend(this.monthTrend);
  }

  /**
   * Get peak hour (the hour with the most sessions).
   */
  getPeakHour(): number {
    let maxCount = 0;
    let peakHour = 8; // default

    for (const [hourStr, count] of Object.entries(this.peakHourDistribution)) {
      if (count > maxCount) {
        maxCount = count;
        peakHour = parseInt(hourStr, 10);
      }
    }

    return peakHour;
  }
}
