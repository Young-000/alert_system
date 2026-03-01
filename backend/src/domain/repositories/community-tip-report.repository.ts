import { CommunityTipReport } from '@domain/entities/community-tip-report.entity';

export interface ICommunityTipReportRepository {
  findByTipAndReporter(tipId: string, reporterId: string): Promise<CommunityTipReport | null>;

  save(report: CommunityTipReport): Promise<CommunityTipReport>;
}

export const COMMUNITY_TIP_REPORT_REPOSITORY = Symbol('ICommunityTipReportRepository');
