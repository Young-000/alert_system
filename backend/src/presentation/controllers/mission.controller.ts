import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  Logger,
  Request,
} from '@nestjs/common';
import { ManageMissionUseCase } from '@application/use-cases/manage-mission.use-case';
import { DailyCheckUseCase } from '@application/use-cases/daily-check.use-case';
import { MissionStatsUseCase } from '@application/use-cases/mission-stats.use-case';
import { AuthenticatedRequest } from '@infrastructure/auth/authenticated-request';
import { getTodayKST } from '@domain/utils/kst-date';
import {
  CreateMissionDto,
  UpdateMissionDto,
  ReorderMissionDto,
} from '../dto/mission.dto';

@Controller('missions')
export class MissionController {
  private readonly logger = new Logger(MissionController.name);

  constructor(
    private readonly manageMissionUseCase: ManageMissionUseCase,
    private readonly dailyCheckUseCase: DailyCheckUseCase,
    private readonly missionStatsUseCase: MissionStatsUseCase,
  ) {}

  /**
   * 사용자 미션 목록 조회
   */
  @Get()
  async getMissions(@Request() req: AuthenticatedRequest): Promise<{
    missions: Array<{
      id: string;
      title: string;
      emoji: string;
      missionType: string;
      isActive: boolean;
      sortOrder: number;
    }>;
  }> {
    const userId = req.user.userId;
    this.logger.log(`Getting missions for user ${userId}`);
    const missions = await this.manageMissionUseCase.getUserMissions(userId);

    return {
      missions: missions.map((m) => ({
        id: m.id,
        title: m.title,
        emoji: m.emoji,
        missionType: m.missionType,
        isActive: m.isActive,
        sortOrder: m.sortOrder,
      })),
    };
  }

  /**
   * 미션 생성
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createMission(
    @Request() req: AuthenticatedRequest,
    @Body() dto: CreateMissionDto,
  ): Promise<{
    id: string;
    title: string;
    emoji: string;
    missionType: string;
    isActive: boolean;
    sortOrder: number;
  }> {
    const userId = req.user.userId;
    this.logger.log(`User ${userId} creating mission: ${dto.title}`);
    const mission = await this.manageMissionUseCase.createMission(
      userId,
      dto.title,
      dto.missionType,
    );

    return {
      id: mission.id,
      title: mission.title,
      emoji: mission.emoji,
      missionType: mission.missionType,
      isActive: mission.isActive,
      sortOrder: mission.sortOrder,
    };
  }

  /**
   * 미션 수정
   */
  @Patch(':id')
  async updateMission(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateMissionDto,
  ): Promise<{
    id: string;
    title: string;
    emoji: string;
    missionType: string;
    isActive: boolean;
    sortOrder: number;
  }> {
    const userId = req.user.userId;
    this.logger.log(`User ${userId} updating mission ${id}`);
    const mission = await this.manageMissionUseCase.updateMission(id, userId, {
      title: dto.title,
      missionType: dto.missionType,
    });

    return {
      id: mission.id,
      title: mission.title,
      emoji: mission.emoji,
      missionType: mission.missionType,
      isActive: mission.isActive,
      sortOrder: mission.sortOrder,
    };
  }

  /**
   * 미션 삭제
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteMission(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<void> {
    const userId = req.user.userId;
    this.logger.log(`User ${userId} deleting mission ${id}`);
    await this.manageMissionUseCase.deleteMission(id, userId);
  }

  /**
   * 미션 활성화/비활성화 토글
   */
  @Patch(':id/toggle')
  async toggleActive(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<{
    id: string;
    isActive: boolean;
  }> {
    const userId = req.user.userId;
    this.logger.log(`User ${userId} toggling mission ${id}`);
    const mission = await this.manageMissionUseCase.toggleActive(id, userId);

    return {
      id: mission.id,
      isActive: mission.isActive,
    };
  }

  /**
   * 미션 순서 변경
   */
  @Patch(':id/reorder')
  async reorder(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: ReorderMissionDto,
  ): Promise<{
    id: string;
    sortOrder: number;
  }> {
    const userId = req.user.userId;
    this.logger.log(`User ${userId} reordering mission ${id} to ${dto.sortOrder}`);
    const mission = await this.manageMissionUseCase.reorder(
      id,
      userId,
      dto.sortOrder,
    );

    return {
      id: mission.id,
      sortOrder: mission.sortOrder,
    };
  }

  /**
   * 오늘의 미션 현황 (출근/퇴근 분리)
   */
  @Get('daily')
  async getDailyStatus(@Request() req: AuthenticatedRequest): Promise<{
    commuteMissions: Array<{
      mission: {
        id: string;
        title: string;
        emoji: string;
        missionType: string;
      };
      isCompleted: boolean;
      completedAt: string | null;
    }>;
    returnMissions: Array<{
      mission: {
        id: string;
        title: string;
        emoji: string;
        missionType: string;
      };
      isCompleted: boolean;
      completedAt: string | null;
    }>;
    completionRate: number;
    streakDay: number;
  }> {
    const userId = req.user.userId;
    const todayKST = getTodayKST();
    this.logger.log(`Getting daily status for user ${userId} on ${todayKST}`);

    const status = await this.dailyCheckUseCase.getDailyStatus(userId, todayKST);

    const mapMissions = (
      items: typeof status.commuteMissions,
    ): Array<{
      mission: {
        id: string;
        title: string;
        emoji: string;
        missionType: string;
      };
      isCompleted: boolean;
      completedAt: string | null;
    }> =>
      items.map((item) => ({
        mission: {
          id: item.mission.id,
          title: item.mission.title,
          emoji: item.mission.emoji,
          missionType: item.mission.missionType,
        },
        isCompleted: item.record?.isCompleted ?? false,
        completedAt: item.record?.completedAt?.toISOString() ?? null,
      }));

    return {
      commuteMissions: mapMissions(status.commuteMissions),
      returnMissions: mapMissions(status.returnMissions),
      completionRate: status.completionRate,
      streakDay: status.streakDay,
    };
  }

  /**
   * 미션 체크 토글
   */
  @Post('daily/:missionId/check')
  @HttpCode(HttpStatus.OK)
  async toggleCheck(
    @Request() req: AuthenticatedRequest,
    @Param('missionId') missionId: string,
  ): Promise<{
    missionId: string;
    isCompleted: boolean;
    completedAt: string | null;
  }> {
    const userId = req.user.userId;
    const todayKST = getTodayKST();
    this.logger.log(`User ${userId} toggling check for mission ${missionId}`);

    const record = await this.dailyCheckUseCase.toggleCheck(
      userId,
      missionId,
      todayKST,
    );

    return {
      missionId: record.missionId,
      isCompleted: record.isCompleted,
      completedAt: record.completedAt?.toISOString() ?? null,
    };
  }

  /**
   * 오늘의 점수 조회
   */
  @Get('daily/score')
  async getDailyScore(@Request() req: AuthenticatedRequest): Promise<{
    date: string;
    totalMissions: number;
    completedMissions: number;
    completionRate: number;
    streakDay: number;
  } | null> {
    const userId = req.user.userId;
    const todayKST = getTodayKST();
    this.logger.log(`Getting daily score for user ${userId} on ${todayKST}`);

    const score = await this.dailyCheckUseCase.getDailyScore(userId, todayKST);

    if (!score) return null;

    return {
      date: score.date,
      totalMissions: score.totalMissions,
      completedMissions: score.completedMissions,
      completionRate: score.completionRate,
      streakDay: score.streakDay,
    };
  }

  /**
   * 주간 통계
   */
  @Get('stats/weekly')
  async getWeeklyStats(@Request() req: AuthenticatedRequest): Promise<{
    totalCompleted: number;
    totalMissions: number;
    completionRate: number;
    dailyScores: Array<{
      date: string;
      totalMissions: number;
      completedMissions: number;
      completionRate: number;
      streakDay: number;
    }>;
  }> {
    const userId = req.user.userId;
    const todayKST = getTodayKST();
    this.logger.log(`Getting weekly stats for user ${userId}`);

    const stats = await this.missionStatsUseCase.getWeeklyStats(
      userId,
      todayKST,
    );

    return {
      totalCompleted: stats.totalCompleted,
      totalMissions: stats.totalMissions,
      completionRate: stats.completionRate,
      dailyScores: stats.dailyScores.map((s) => ({
        date: s.date,
        totalMissions: s.totalMissions,
        completedMissions: s.completedMissions,
        completionRate: s.completionRate,
        streakDay: s.streakDay,
      })),
    };
  }

  /**
   * 월간 통계
   */
  @Get('stats/monthly')
  async getMonthlyStats(@Request() req: AuthenticatedRequest): Promise<{
    totalCompleted: number;
    totalMissions: number;
    completionRate: number;
    dailyScores: Array<{
      date: string;
      totalMissions: number;
      completedMissions: number;
      completionRate: number;
      streakDay: number;
    }>;
  }> {
    const userId = req.user.userId;
    const todayKST = getTodayKST();
    this.logger.log(`Getting monthly stats for user ${userId}`);

    const stats = await this.missionStatsUseCase.getMonthlyStats(
      userId,
      todayKST,
    );

    return {
      totalCompleted: stats.totalCompleted,
      totalMissions: stats.totalMissions,
      completionRate: stats.completionRate,
      dailyScores: stats.dailyScores.map((s) => ({
        date: s.date,
        totalMissions: s.totalMissions,
        completedMissions: s.completedMissions,
        completionRate: s.completionRate,
        streakDay: s.streakDay,
      })),
    };
  }

  /**
   * 연속 달성일 조회
   */
  @Get('streak')
  async getStreak(@Request() req: AuthenticatedRequest): Promise<{
    streakDay: number;
  }> {
    const userId = req.user.userId;
    this.logger.log(`Getting streak for user ${userId}`);

    const streakDay = await this.missionStatsUseCase.getStreak(userId);

    return { streakDay };
  }
}
