import { RegionalInsight } from '@domain/entities/regional-insight.entity';

export type InsightSortBy = 'userCount' | 'sessionCount' | 'avgDuration' | 'regionName';

export interface FindAllOptions {
  sortBy?: InsightSortBy;
  limit?: number;
  offset?: number;
  minUserCount?: number;
}

export interface IRegionalInsightRepository {
  findByRegionId(regionId: string): Promise<RegionalInsight | null>;

  findAll(options?: FindAllOptions): Promise<RegionalInsight[]>;

  countAll(minUserCount?: number): Promise<number>;

  save(insight: RegionalInsight): Promise<RegionalInsight>;

  saveMany(insights: RegionalInsight[]): Promise<void>;

  deleteAll(): Promise<void>;
}

export const REGIONAL_INSIGHT_REPOSITORY = Symbol('IRegionalInsightRepository');
