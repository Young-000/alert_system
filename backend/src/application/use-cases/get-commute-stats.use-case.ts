import { Injectable, Inject, Optional } from '@nestjs/common';
import {
  ICommuteSessionRepository,
  COMMUTE_SESSION_REPOSITORY,
} from '@domain/repositories/commute-session.repository';
import {
  ICommuteRouteRepository,
  COMMUTE_ROUTE_REPOSITORY,
} from '@domain/repositories/commute-route.repository';
import { CommuteSession, SessionStatus } from '@domain/entities/commute-session.entity';
import { CheckpointRecord } from '@domain/entities/checkpoint-record.entity';
import {
  CommuteStatsResponseDto,
  RouteStatsDto,
  CheckpointStatsDto,
  DayOfWeekStatsDto,
  WeatherImpactDto,
} from '@application/dto/commute.dto';
import { CheckpointType } from '@domain/entities/commute-route.entity';

interface CheckpointInfo {
  id: string;
  name: string;
  checkpointType: CheckpointType;
  sequenceOrder: number;
  expectedDurationToNext?: number;
  expectedWaitTime: number;
}

@Injectable()
export class GetCommuteStatsUseCase {
  private readonly dayNames = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];

  constructor(
    @Optional()
    @Inject(COMMUTE_SESSION_REPOSITORY)
    private readonly sessionRepository?: ICommuteSessionRepository,
    @Optional()
    @Inject(COMMUTE_ROUTE_REPOSITORY)
    private readonly routeRepository?: ICommuteRouteRepository,
  ) {}

  async execute(userId: string, days = 30): Promise<CommuteStatsResponseDto> {
    if (!this.sessionRepository || !this.routeRepository) {
      throw new Error('Required repositories not available');
    }

    // Get sessions from the last N days
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const sessions = await this.sessionRepository.findByUserIdInDateRange(
      userId,
      startDate,
      endDate
    );

    const completedSessions = sessions.filter(
      (s) => s.status === SessionStatus.COMPLETED && s.totalDurationMinutes
    );

    if (completedSessions.length === 0) {
      return this.emptyStats(userId);
    }

    // Calculate overall stats
    const overallAverageDuration = this.average(
      completedSessions.map((s) => s.totalDurationMinutes!)
    );
    const overallAverageWaitTime = this.average(completedSessions.map((s) => s.totalWaitMinutes));
    const overallAverageDelay = this.average(completedSessions.map((s) => s.totalDelayMinutes));
    const waitTimePercentage =
      overallAverageDuration > 0 ? (overallAverageWaitTime / overallAverageDuration) * 100 : 0;

    // Get route stats
    const routeStats = await this.calculateRouteStats(completedSessions);

    // Get day of week stats
    const dayOfWeekStats = this.calculateDayOfWeekStats(completedSessions);

    // Get weather impact stats
    const weatherImpact = this.calculateWeatherImpact(completedSessions);

    // Generate insights
    const insights = this.generateInsights(
      completedSessions,
      routeStats,
      dayOfWeekStats,
      weatherImpact
    );

    return {
      userId,
      totalSessions: sessions.length,
      recentSessions: completedSessions.length,
      overallAverageDuration: Math.round(overallAverageDuration),
      overallAverageWaitTime: Math.round(overallAverageWaitTime),
      overallAverageDelay: Math.round(overallAverageDelay),
      waitTimePercentage: Math.round(waitTimePercentage),
      routeStats,
      dayOfWeekStats,
      weatherImpact,
      insights,
    };
  }

  private async calculateRouteStats(sessions: CommuteSession[]): Promise<RouteStatsDto[]> {
    if (!this.routeRepository) return [];

    // Group sessions by route
    const sessionsByRoute = new Map<string, CommuteSession[]>();
    for (const session of sessions) {
      const existing = sessionsByRoute.get(session.routeId) || [];
      existing.push(session);
      sessionsByRoute.set(session.routeId, existing);
    }

    const routeStats: RouteStatsDto[] = [];

    for (const [routeId, routeSessions] of sessionsByRoute) {
      const route = await this.routeRepository.findById(routeId);
      if (!route) continue;

      const checkpointInfoMap = new Map<string, CheckpointInfo>();
      route.checkpoints.forEach((cp) => {
        checkpointInfoMap.set(cp.id, {
          id: cp.id,
          name: cp.name,
          checkpointType: cp.checkpointType,
          sequenceOrder: cp.sequenceOrder,
          expectedDurationToNext: cp.expectedDurationToNext,
          expectedWaitTime: cp.expectedWaitTime,
        });
      });

      // Calculate checkpoint stats
      const checkpointStats = this.calculateCheckpointStats(routeSessions, checkpointInfoMap);

      // Find bottleneck and most variable checkpoints
      const bottleneckCheckpoint = checkpointStats.reduce(
        (worst, current) => (current.averageDelay > (worst?.averageDelay ?? -Infinity) ? current : worst),
        checkpointStats[0]
      );

      const mostVariableCheckpoint = checkpointStats.reduce(
        (worst, current) => (current.variability > (worst?.variability ?? -Infinity) ? current : worst),
        checkpointStats[0]
      );

      const avgDuration = this.average(routeSessions.map((s) => s.totalDurationMinutes!));
      const avgWaitTime = this.average(routeSessions.map((s) => s.totalWaitMinutes));
      const avgDelay = this.average(routeSessions.map((s) => s.totalDelayMinutes));

      routeStats.push({
        routeId,
        routeName: route.name,
        totalSessions: routeSessions.length,
        averageTotalDuration: Math.round(avgDuration),
        averageTotalWaitTime: Math.round(avgWaitTime),
        averageDelay: Math.round(avgDelay),
        waitTimePercentage: avgDuration > 0 ? Math.round((avgWaitTime / avgDuration) * 100) : 0,
        checkpointStats,
        bottleneckCheckpoint: bottleneckCheckpoint?.checkpointName,
        mostVariableCheckpoint: mostVariableCheckpoint?.checkpointName,
      });
    }

    return routeStats;
  }

  private calculateCheckpointStats(
    sessions: CommuteSession[],
    checkpointInfoMap: Map<string, CheckpointInfo>
  ): CheckpointStatsDto[] {
    // Group records by checkpoint
    const recordsByCheckpoint = new Map<string, CheckpointRecord[]>();

    for (const session of sessions) {
      for (const record of session.checkpointRecords) {
        const existing = recordsByCheckpoint.get(record.checkpointId) || [];
        existing.push(record);
        recordsByCheckpoint.set(record.checkpointId, existing);
      }
    }

    const stats: CheckpointStatsDto[] = [];

    for (const [checkpointId, records] of recordsByCheckpoint) {
      const info = checkpointInfoMap.get(checkpointId);
      if (!info) continue;

      const durations = records
        .map((r) => r.durationFromPrevious)
        .filter((d): d is number => d !== undefined);
      const waitTimes = records.map((r) => r.actualWaitTime);
      const delays = records.map((r) => r.delayMinutes);

      const avgDuration = this.average(durations);
      const avgWaitTime = this.average(waitTimes);
      const avgDelay = this.average(delays);
      const variability = this.standardDeviation(durations);

      stats.push({
        checkpointId,
        checkpointName: info.name,
        checkpointType: info.checkpointType,
        expectedDuration: info.expectedDurationToNext || 0,
        expectedWaitTime: info.expectedWaitTime,
        averageActualDuration: Math.round(avgDuration * 10) / 10,
        averageActualWaitTime: Math.round(avgWaitTime * 10) / 10,
        averageDelay: Math.round(avgDelay * 10) / 10,
        sampleCount: records.length,
        variability: Math.round(variability * 10) / 10,
        isBottleneck: false, // Will be set by parent
      });
    }

    // Mark the bottleneck
    if (stats.length > 0) {
      const maxDelay = Math.max(...stats.map((s) => s.averageDelay));
      stats.forEach((s) => {
        s.isBottleneck = s.averageDelay === maxDelay && maxDelay > 0;
      });
    }

    return stats.sort((a, b) => {
      // Sort by sequence order if we have checkpoint info
      const seqA = checkpointInfoMap.get(a.checkpointId)?.sequenceOrder ?? 0;
      const seqB = checkpointInfoMap.get(b.checkpointId)?.sequenceOrder ?? 0;
      return seqA - seqB;
    });
  }

  private calculateDayOfWeekStats(sessions: CommuteSession[]): DayOfWeekStatsDto[] {
    // Group sessions by day of week
    const sessionsByDay = new Map<number, CommuteSession[]>();

    for (const session of sessions) {
      const dayOfWeek = session.startedAt.getDay();
      const existing = sessionsByDay.get(dayOfWeek) || [];
      existing.push(session);
      sessionsByDay.set(dayOfWeek, existing);
    }

    const stats: DayOfWeekStatsDto[] = [];

    for (let day = 0; day < 7; day++) {
      const daySessions = sessionsByDay.get(day) || [];
      if (daySessions.length === 0) {
        stats.push({
          dayOfWeek: day,
          dayName: this.dayNames[day],
          averageDuration: 0,
          averageWaitTime: 0,
          averageDelay: 0,
          sampleCount: 0,
        });
        continue;
      }

      stats.push({
        dayOfWeek: day,
        dayName: this.dayNames[day],
        averageDuration: Math.round(this.average(daySessions.map((s) => s.totalDurationMinutes!))),
        averageWaitTime: Math.round(this.average(daySessions.map((s) => s.totalWaitMinutes))),
        averageDelay: Math.round(this.average(daySessions.map((s) => s.totalDelayMinutes))),
        sampleCount: daySessions.length,
      });
    }

    return stats;
  }

  private calculateWeatherImpact(sessions: CommuteSession[]): WeatherImpactDto[] {
    // Group sessions by weather condition
    const sessionsByWeather = new Map<string, CommuteSession[]>();

    for (const session of sessions) {
      const weather = session.weatherCondition || '맑음';
      const existing = sessionsByWeather.get(weather) || [];
      existing.push(session);
      sessionsByWeather.set(weather, existing);
    }

    // Calculate baseline (맑음) duration
    const clearSessions = sessionsByWeather.get('맑음') || [];
    const baselineDuration =
      clearSessions.length > 0
        ? this.average(clearSessions.map((s) => s.totalDurationMinutes!))
        : 0;

    const stats: WeatherImpactDto[] = [];

    for (const [condition, weatherSessions] of sessionsByWeather) {
      const avgDuration = this.average(weatherSessions.map((s) => s.totalDurationMinutes!));
      const avgDelay = this.average(weatherSessions.map((s) => s.totalDelayMinutes));

      stats.push({
        condition,
        averageDuration: Math.round(avgDuration),
        averageDelay: Math.round(avgDelay),
        sampleCount: weatherSessions.length,
        comparedToNormal:
          baselineDuration > 0 ? Math.round(avgDuration - baselineDuration) : 0,
      });
    }

    return stats.sort((a, b) => b.sampleCount - a.sampleCount);
  }

  private generateInsights(
    sessions: CommuteSession[],
    routeStats: RouteStatsDto[],
    dayOfWeekStats: DayOfWeekStatsDto[],
    weatherImpact: WeatherImpactDto[]
  ): string[] {
    const insights: string[] = [];

    // Find the slowest day of the week
    const weekdayStats = dayOfWeekStats.filter(
      (d) => d.sampleCount > 0 && d.dayOfWeek >= 1 && d.dayOfWeek <= 5
    );
    if (weekdayStats.length > 0) {
      const slowestDay = weekdayStats.reduce((slowest, current) =>
        current.averageDuration > slowest.averageDuration ? current : slowest
      );
      const fastestDay = weekdayStats.reduce((fastest, current) =>
        current.averageDuration < fastest.averageDuration ? current : fastest
      );

      if (slowestDay.averageDuration - fastestDay.averageDuration >= 3) {
        insights.push(
          `${slowestDay.dayName}이 평균 ${slowestDay.averageDuration - fastestDay.averageDuration}분 더 오래 걸려요`
        );
      }
    }

    // Find weather impact
    const rainyWeather = weatherImpact.find(
      (w) => w.condition === '비' || w.condition === '소나기'
    );
    if (rainyWeather && rainyWeather.comparedToNormal >= 3) {
      insights.push(`비 오는 날 평균 ${rainyWeather.comparedToNormal}분 더 걸려요`);
    }

    // Find bottleneck checkpoints
    for (const route of routeStats) {
      if (route.bottleneckCheckpoint) {
        const bottleneck = route.checkpointStats.find((c) => c.isBottleneck);
        if (bottleneck && bottleneck.averageDelay >= 2) {
          insights.push(
            `"${route.routeName}" 경로에서 "${bottleneck.checkpointName}" 구간이 가장 지연이 많아요 (평균 +${bottleneck.averageDelay}분)`
          );
        }
      }

      // Find high variability checkpoints
      if (route.mostVariableCheckpoint) {
        const variable = route.checkpointStats.reduce((v, c) =>
          c.variability > v.variability ? c : v
        );
        if (variable.variability >= 3) {
          insights.push(
            `"${variable.checkpointName}" 구간은 소요 시간 변동이 커요 (±${variable.variability}분)`
          );
        }
      }

      // Wait time insights
      if (route.waitTimePercentage >= 25) {
        insights.push(
          `"${route.routeName}" 경로의 ${route.waitTimePercentage}%가 대기/환승 시간이에요`
        );
      }
    }

    // Overall insights
    const overallWaitPercentage =
      sessions.length > 0
        ? Math.round(
            (this.average(sessions.map((s) => s.totalWaitMinutes)) /
              this.average(sessions.map((s) => s.totalDurationMinutes || 0))) *
              100
          )
        : 0;

    if (overallWaitPercentage >= 30) {
      insights.push(`통근 시간의 ${overallWaitPercentage}%가 대기/환승에 소요돼요`);
    }

    return insights.slice(0, 5); // Limit to top 5 insights
  }

  private emptyStats(userId: string): CommuteStatsResponseDto {
    return {
      userId,
      totalSessions: 0,
      recentSessions: 0,
      overallAverageDuration: 0,
      overallAverageWaitTime: 0,
      overallAverageDelay: 0,
      waitTimePercentage: 0,
      routeStats: [],
      dayOfWeekStats: this.dayNames.map((name, index) => ({
        dayOfWeek: index,
        dayName: name,
        averageDuration: 0,
        averageWaitTime: 0,
        averageDelay: 0,
        sampleCount: 0,
      })),
      weatherImpact: [],
      insights: ['아직 충분한 데이터가 없어요. 출퇴근을 기록해주세요!'],
    };
  }

  private average(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    return numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
  }

  private standardDeviation(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    const avg = this.average(numbers);
    const squareDiffs = numbers.map((n) => Math.pow(n - avg, 2));
    return Math.sqrt(this.average(squareDiffs));
  }
}
