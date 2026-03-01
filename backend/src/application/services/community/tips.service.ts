import {
  Injectable,
  Logger,
  Inject,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { COMMUNITY_TIP_REPOSITORY, ICommunityTipRepository } from '@domain/repositories/community-tip.repository';
import { COMMUNITY_TIP_REPORT_REPOSITORY, ICommunityTipReportRepository } from '@domain/repositories/community-tip-report.repository';
import { COMMUNITY_TIP_HELPFUL_REPOSITORY, ICommunityTipHelpfulRepository } from '@domain/repositories/community-tip-helpful.repository';
import { CommunityTip, AUTO_HIDE_REPORT_THRESHOLD } from '@domain/entities/community-tip.entity';
import { CommunityTipReport } from '@domain/entities/community-tip-report.entity';
import { CommuteSessionEntity } from '@infrastructure/persistence/typeorm/commute-session.entity';
import {
  TipsListResponseDto,
  TipDto,
  CreateTipRequestDto,
  CreateTipResponseDto,
  ReportTipResponseDto,
  HelpfulTipResponseDto,
} from '@application/dto/community.dto';

const MIN_SESSIONS_FOR_WRITING = 3;

@Injectable()
export class TipsService {
  private readonly logger = new Logger(TipsService.name);

  constructor(
    @Inject(COMMUNITY_TIP_REPOSITORY)
    private readonly tipRepo: ICommunityTipRepository,
    @Inject(COMMUNITY_TIP_REPORT_REPOSITORY)
    private readonly reportRepo: ICommunityTipReportRepository,
    @Inject(COMMUNITY_TIP_HELPFUL_REPOSITORY)
    private readonly helpfulRepo: ICommunityTipHelpfulRepository,
    @InjectRepository(CommuteSessionEntity)
    private readonly sessionRepo: Repository<CommuteSessionEntity>,
  ) {}

  /**
   * Get tips for a checkpoint (paginated).
   * PRIVACY: Never expose author info.
   */
  async getTips(
    checkpointKey: string,
    userId: string | null,
    page: number = 1,
    limit: number = 20,
  ): Promise<TipsListResponseDto> {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(Math.max(1, limit), 50);

    const [tips, total] = await Promise.all([
      this.tipRepo.findByCheckpointKey({
        checkpointKey,
        page: safePage,
        limit: safeLimit,
      }),
      this.tipRepo.countByCheckpointKey(checkpointKey),
    ]);

    // Batch-check if user reported/found-helpful these tips
    let reportedTipIds: Set<string> = new Set();
    let helpfulTipIds: Set<string> = new Set();

    if (userId && tips.length > 0) {
      const tipIds = tips.map((t) => t.id);

      const [reportedIds, helpfulIds] = await Promise.all([
        this.getReportedTipIds(userId, tipIds),
        this.helpfulRepo.findUserHelpfulTipIds(userId, tipIds),
      ]);

      reportedTipIds = new Set(reportedIds);
      helpfulTipIds = new Set(helpfulIds);
    }

    const tipDtos: TipDto[] = tips.map((tip) => ({
      id: tip.id,
      content: tip.content,
      helpfulCount: tip.helpfulCount,
      createdAt: tip.createdAt.toISOString(),
      isHelpfulByMe: helpfulTipIds.has(tip.id),
      isReportedByMe: reportedTipIds.has(tip.id),
    }));

    return {
      tips: tipDtos,
      total,
      page: safePage,
      limit: safeLimit,
      hasNext: safePage * safeLimit < total,
    };
  }

  /**
   * Create a new tip.
   * Rate limit: 3/day per user.
   * Requires 3+ completed sessions.
   */
  async createTip(
    userId: string,
    dto: CreateTipRequestDto,
  ): Promise<CreateTipResponseDto> {
    // Validate content
    const validationError = CommunityTip.validateContent(dto.content);
    if (validationError) {
      throw new BadRequestException(validationError);
    }

    // Check session count (anti-spam)
    const sessionCount = await this.sessionRepo.count({
      where: { userId, status: 'completed' },
    });
    if (sessionCount < MIN_SESSIONS_FOR_WRITING) {
      throw new BadRequestException(
        `3회 이상 출퇴근 기록 후 팁을 남길 수 있어요. (현재 ${sessionCount}회)`,
      );
    }

    // Check daily rate limit
    const todayCount = await this.tipRepo.countUserTipsToday(userId);
    if (CommunityTip.exceedsDailyLimit(todayCount)) {
      throw new TooManyTipsException();
    }

    const tip = new CommunityTip({
      checkpointKey: dto.checkpointKey,
      authorId: userId,
      content: dto.content.trim(),
    });

    const saved = await this.tipRepo.save(tip);

    return {
      id: saved.id,
      content: saved.content,
      createdAt: saved.createdAt.toISOString(),
    };
  }

  /**
   * Report a tip.
   * Auto-hides at 3+ reports.
   */
  async reportTip(tipId: string, reporterId: string): Promise<ReportTipResponseDto> {
    const tip = await this.tipRepo.findById(tipId);
    if (!tip) {
      throw new NotFoundException('팁을 찾을 수 없습니다.');
    }
    if (tip.isHidden) {
      throw new NotFoundException('팁을 찾을 수 없습니다.');
    }

    // Check for duplicate report
    const existing = await this.reportRepo.findByTipAndReporter(tipId, reporterId);
    if (existing) {
      throw new ConflictException('이미 신고한 팁입니다.');
    }

    // Save report
    const report = new CommunityTipReport({
      tipId,
      reporterId,
    });
    await this.reportRepo.save(report);

    // Increment report count
    await this.tipRepo.incrementReportCount(tipId);

    // Auto-hide if threshold reached
    const newReportCount = tip.reportCount + 1;
    if (newReportCount >= AUTO_HIDE_REPORT_THRESHOLD) {
      await this.tipRepo.markHidden(tipId);
      this.logger.log(`Tip ${tipId} auto-hidden after ${newReportCount} reports`);
    }

    return { message: '신고되었습니다.' };
  }

  /**
   * Toggle helpful on a tip.
   */
  async toggleHelpful(tipId: string, userId: string): Promise<HelpfulTipResponseDto> {
    const tip = await this.tipRepo.findById(tipId);
    if (!tip || tip.isHidden) {
      throw new NotFoundException('팁을 찾을 수 없습니다.');
    }

    const alreadyHelpful = await this.helpfulRepo.exists(tipId, userId);

    if (alreadyHelpful) {
      // Remove helpful
      await this.helpfulRepo.remove(tipId, userId);
      await this.tipRepo.decrementHelpfulCount(tipId);
      return {
        message: '도움이 됐어요를 취소했습니다.',
        helpfulCount: Math.max(0, tip.helpfulCount - 1),
        isHelpfulByMe: false,
      };
    }

    // Add helpful
    await this.helpfulRepo.save(tipId, userId);
    await this.tipRepo.incrementHelpfulCount(tipId);
    return {
      message: '도움이 됐어요!',
      helpfulCount: tip.helpfulCount + 1,
      isHelpfulByMe: true,
    };
  }

  /**
   * Batch-check which tips a user has reported.
   */
  private async getReportedTipIds(userId: string, tipIds: string[]): Promise<string[]> {
    if (tipIds.length === 0) return [];

    // Use the report repository's underlying repo via raw query
    const results: Array<{ tip_id: string }> = [];
    for (const tipId of tipIds) {
      const existing = await this.reportRepo.findByTipAndReporter(tipId, userId);
      if (existing) {
        results.push({ tip_id: tipId });
      }
    }
    return results.map((r) => r.tip_id);
  }
}

/**
 * Custom exception for rate limiting (returns 429).
 */
export class TooManyTipsException extends Error {
  readonly statusCode = 429;
  readonly message = '오늘은 팁을 3개까지 남길 수 있어요.';

  constructor() {
    super('오늘은 팁을 3개까지 남길 수 있어요.');
    this.name = 'TooManyTipsException';
  }
}
