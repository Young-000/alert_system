import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import {
  ICommuteSessionRepository,
  COMMUTE_SESSION_REPOSITORY,
} from '@domain/repositories/commute-session.repository';
import {
  ICommuteStreakRepository,
  COMMUTE_STREAK_REPOSITORY,
} from '@domain/repositories/commute-streak.repository';
import { getTodayKST, getWeekBounds, toDateKST } from '@domain/utils/kst-date';
import { buildWeeklyReport } from '@domain/utils/build-weekly-report';
import type { WeeklyReportResponseDto } from '@application/dto/weekly-report.dto';

@Injectable()
export class GetWeeklyReportUseCase {
  constructor(
    @Inject(COMMUTE_SESSION_REPOSITORY)
    private readonly sessionRepository: ICommuteSessionRepository,
    @Inject(COMMUTE_STREAK_REPOSITORY)
    private readonly streakRepository: ICommuteStreakRepository,
  ) {}

  async execute(userId: string, weekOffset = 0): Promise<WeeklyReportResponseDto> {
    // weekOffset 유효성 검사
    if (weekOffset < 0 || weekOffset > 4) {
      throw new BadRequestException('weekOffset은 0~4 범위만 허용됩니다.');
    }

    const todayKST = getTodayKST();

    // 1. 주간 경계 계산 (월요일~일요일, KST)
    const { weekStart, weekEnd } = getWeekBounds(todayKST, weekOffset);

    // 2. 이번 주 세션 조회
    const currentWeekSessions = await this.sessionRepository.findByUserIdInDateRange(
      userId,
      toDateKST(weekStart),
      toDateKST(weekEnd, true), // 일요일 23:59:59
    );

    // 3. 전주 세션 조회 (전주 대비 비교용)
    const { weekStart: prevStart, weekEnd: prevEnd } = getWeekBounds(todayKST, weekOffset + 1);
    const previousWeekSessions = await this.sessionRepository.findByUserIdInDateRange(
      userId,
      toDateKST(prevStart),
      toDateKST(prevEnd, true),
    );

    // 4. 스트릭 주간 현황 조회
    const streak = await this.streakRepository.findByUserId(userId);
    const streakWeeklyCount = streak?.weeklyCount ?? 0;
    const streakWeeklyGoal = streak?.weeklyGoal ?? 5;

    // 5. 순수 함수로 리포트 빌드
    return buildWeeklyReport(
      currentWeekSessions,
      previousWeekSessions,
      weekStart,
      weekEnd,
      streakWeeklyCount,
      streakWeeklyGoal,
    );
  }
}
