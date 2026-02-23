import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  Logger,
  UseGuards,
  Request,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ManageChallengeUseCase } from '@application/use-cases/manage-challenge.use-case';
import { ChallengeConflictError } from '@application/use-cases/manage-challenge.use-case';
import { AuthenticatedRequest } from '@infrastructure/auth/authenticated-request';

@Controller('challenges')
@UseGuards(AuthGuard('jwt'))
export class ChallengeController {
  private readonly logger = new Logger(ChallengeController.name);

  constructor(
    private readonly manageChallengeUseCase: ManageChallengeUseCase,
  ) {}

  /**
   * 도전 템플릿 목록 조회
   */
  @Get('templates')
  async getTemplates(@Request() req: AuthenticatedRequest): Promise<{
    templates: Array<{
      id: string;
      category: string;
      name: string;
      description: string;
      targetValue: number;
      conditionType: string;
      conditionValue: number;
      durationDays: number;
      difficulty: string;
      badgeEmoji: string;
      badgeName: string;
      isJoined: boolean;
      isCompleted: boolean;
    }>;
    categories: Array<{ key: string; label: string; emoji: string }>;
  }> {
    const userId = req.user.userId;
    this.logger.log(`Getting challenge templates for user ${userId}`);
    const templates = await this.manageChallengeUseCase.getTemplates(userId);

    return {
      templates: templates.map((t) => ({
        id: t.template.id,
        category: t.template.category,
        name: t.template.name,
        description: t.template.description,
        targetValue: t.template.targetValue,
        conditionType: t.template.conditionType,
        conditionValue: t.template.conditionValue,
        durationDays: t.template.durationDays,
        difficulty: t.template.difficulty,
        badgeEmoji: t.template.badgeEmoji,
        badgeName: t.template.badgeName,
        isJoined: t.isJoined,
        isCompleted: t.isCompleted,
      })),
      categories: [
        { key: 'time_goal', label: '시간 목표', emoji: '⏱' },
        { key: 'streak', label: '연속 달성', emoji: '🔥' },
        { key: 'weekly_frequency', label: '주간 빈도', emoji: '📅' },
      ],
    };
  }

  /**
   * 도전 시작 (참여)
   */
  @Post('join')
  @HttpCode(HttpStatus.CREATED)
  async joinChallenge(
    @Request() req: AuthenticatedRequest,
    @Body() body: { templateId: string },
  ): Promise<{
    id: string;
    templateId: string;
    status: string;
    startedAt: string;
    deadlineAt: string;
    currentProgress: number;
    targetProgress: number;
  }> {
    const userId = req.user.userId;
    this.logger.log(`User ${userId} joining challenge template ${body.templateId}`);

    try {
      const challenge = await this.manageChallengeUseCase.joinChallenge(
        userId,
        body.templateId,
      );
      return {
        id: challenge.id,
        templateId: challenge.challengeTemplateId,
        status: challenge.status,
        startedAt: challenge.startedAt.toISOString(),
        deadlineAt: challenge.deadlineAt.toISOString(),
        currentProgress: challenge.currentProgress,
        targetProgress: challenge.targetProgress,
      };
    } catch (error) {
      if (error instanceof ChallengeConflictError) {
        throw new ConflictException(error.message);
      }
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw error;
    }
  }

  /**
   * 활성 도전 목록 조회
   */
  @Get('active')
  async getActiveChallenges(@Request() req: AuthenticatedRequest): Promise<{
    challenges: Array<{
      id: string;
      template: {
        id: string;
        category: string;
        name: string;
        description: string;
        badgeEmoji: string;
        badgeName: string;
        difficulty: string;
      };
      status: string;
      startedAt: string;
      deadlineAt: string;
      currentProgress: number;
      targetProgress: number;
      progressPercent: number;
      daysRemaining: number;
      isCloseToCompletion: boolean;
    }>;
  }> {
    const userId = req.user.userId;
    this.logger.log(`Getting active challenges for user ${userId}`);
    const challenges = await this.manageChallengeUseCase.getActiveChallenges(userId);

    return {
      challenges: challenges.map((c) => ({
        id: c.id,
        template: {
          id: c.template.id,
          category: c.template.category,
          name: c.template.name,
          description: c.template.description,
          badgeEmoji: c.template.badgeEmoji,
          badgeName: c.template.badgeName,
          difficulty: c.template.difficulty,
        },
        status: c.status,
        startedAt: c.startedAt.toISOString(),
        deadlineAt: c.deadlineAt.toISOString(),
        currentProgress: c.currentProgress,
        targetProgress: c.targetProgress,
        progressPercent: c.progressPercent,
        daysRemaining: c.daysRemaining,
        isCloseToCompletion: c.isCloseToCompletion,
      })),
    };
  }

  /**
   * 도전 포기
   */
  @Post(':challengeId/abandon')
  @HttpCode(HttpStatus.OK)
  async abandonChallenge(
    @Request() req: AuthenticatedRequest,
    @Param('challengeId') challengeId: string,
  ): Promise<{ success: boolean }> {
    const userId = req.user.userId;
    this.logger.log(`User ${userId} abandoning challenge ${challengeId}`);
    await this.manageChallengeUseCase.abandonChallenge(userId, challengeId);
    return { success: true };
  }

  /**
   * 도전 히스토리 조회
   */
  @Get('history')
  async getChallengeHistory(
    @Request() req: AuthenticatedRequest,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ): Promise<{
    challenges: Array<{
      id: string;
      template: {
        id: string;
        category: string;
        name: string;
        description: string;
        badgeEmoji: string;
        badgeName: string;
        difficulty: string;
      };
      status: string;
      startedAt: string;
      deadlineAt: string;
      currentProgress: number;
      targetProgress: number;
      progressPercent: number;
      daysRemaining: number;
      isCloseToCompletion: boolean;
    }>;
    totalCount: number;
    stats: {
      totalCompleted: number;
      totalFailed: number;
      totalAbandoned: number;
      completionRate: number;
    };
  }> {
    const userId = req.user.userId;
    this.logger.log(`Getting challenge history for user ${userId}`);
    const result = await this.manageChallengeUseCase.getChallengeHistory(
      userId,
      parseInt(limit || '20', 10),
      parseInt(offset || '0', 10),
    );

    return {
      challenges: result.challenges.map((c) => ({
        id: c.id,
        template: {
          id: c.template.id,
          category: c.template.category,
          name: c.template.name,
          description: c.template.description,
          badgeEmoji: c.template.badgeEmoji,
          badgeName: c.template.badgeName,
          difficulty: c.template.difficulty,
        },
        status: c.status,
        startedAt: c.startedAt.toISOString(),
        deadlineAt: c.deadlineAt.toISOString(),
        currentProgress: c.currentProgress,
        targetProgress: c.targetProgress,
        progressPercent: c.progressPercent,
        daysRemaining: c.daysRemaining,
        isCloseToCompletion: c.isCloseToCompletion,
      })),
      totalCount: result.totalCount,
      stats: result.stats,
    };
  }

  /**
   * 배지 목록 조회
   */
  @Get('badges')
  async getBadges(@Request() req: AuthenticatedRequest): Promise<{
    badges: Array<{
      id: string;
      badgeId: string;
      badgeName: string;
      badgeEmoji: string;
      challengeId: string;
      earnedAt: string;
    }>;
    totalBadges: number;
    earnedCount: number;
  }> {
    const userId = req.user.userId;
    this.logger.log(`Getting badges for user ${userId}`);
    const result = await this.manageChallengeUseCase.getBadges(userId);

    return {
      badges: result.badges.map((b) => ({
        id: b.id,
        badgeId: b.badgeId,
        badgeName: b.badgeName,
        badgeEmoji: b.badgeEmoji,
        challengeId: b.challengeId,
        earnedAt: b.earnedAt.toISOString(),
      })),
      totalBadges: result.totalBadges,
      earnedCount: result.earnedCount,
    };
  }
}
