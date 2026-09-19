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
    //    저장된 weeklyCount는 마지막 기록 시점의 주 것이라 새 주가 시작되면 낡는다.
    //    GET /streak(홈 배지)과 같은 보정을 걸지 않으면 홈 한 화면에서
    //    배지는 0/5, 주간 리포트는 3/5로 두 숫자가 갈린다.
    const streak = await this.streakRepository.findByUserId(userId);
    streak?.ensureWeeklyCountCurrent(todayKST);
    const streakWeeklyGoal = streak?.weeklyGoal ?? 5;

    //    스트릭은 이번 주 집계 하나뿐이다. 지난주 리포트에 그 값을 실으면
    //    "2월 2주차" 헤더 아래에 이번 주 기록이 표시된다. 이번 주가 아니면
    //    null을 넘겨 그 주의 기록일 수로 세게 한다.
    const streakWeeklyCount = weekOffset === 0 ? (streak?.weeklyCount ?? 0) : null;

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
