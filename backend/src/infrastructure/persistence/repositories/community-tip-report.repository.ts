import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CommunityTipReportEntity } from '../typeorm/community-tip-report.entity';
import { ICommunityTipReportRepository } from '@domain/repositories/community-tip-report.repository';
import { CommunityTipReport } from '@domain/entities/community-tip-report.entity';

@Injectable()
export class CommunityTipReportRepositoryImpl implements ICommunityTipReportRepository {
  constructor(
    @InjectRepository(CommunityTipReportEntity)
    private readonly repository: Repository<CommunityTipReportEntity>,
  ) {}

  async findByTipAndReporter(tipId: string, reporterId: string): Promise<CommunityTipReport | null> {
    const entity = await this.repository.findOne({
      where: { tipId, reporterId },
    });
    return entity ? this.toDomain(entity) : null;
  }

  async save(report: CommunityTipReport): Promise<CommunityTipReport> {
    const entity = this.toEntity(report);
    const saved = await this.repository.save(entity);
    return this.toDomain(saved);
  }

  private toDomain(entity: CommunityTipReportEntity): CommunityTipReport {
    return new CommunityTipReport({
      id: entity.id,
      tipId: entity.tipId,
      reporterId: entity.reporterId,
      createdAt: entity.createdAt,
    });
  }

  private toEntity(report: CommunityTipReport): CommunityTipReportEntity {
    const entity = new CommunityTipReportEntity();
    if (report.id) entity.id = report.id;
    entity.tipId = report.tipId;
    entity.reporterId = report.reporterId;
    return entity;
  }
}
