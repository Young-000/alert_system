import { CommunityTipReport } from '@domain/entities/community-tip-report.entity';

export interface ICommunityTipReportRepository {
  findByTipAndReporter(tipId: string, reporterId: string): Promise<CommunityTipReport | null>;

  findReportedTipIds(reporterId: string, tipIds: string[]): Promise<string[]>;

  save(report: CommunityTipReport): Promise<CommunityTipReport>;
}

export const COMMUNITY_TIP_REPORT_REPOSITORY = Symbol('ICommunityTipReportRepository');
