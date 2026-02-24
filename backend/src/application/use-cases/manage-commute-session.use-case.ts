import { Injectable, Inject, Optional, NotFoundException, BadRequestException } from '@nestjs/common';
import {
  ICommuteSessionRepository,
  COMMUTE_SESSION_REPOSITORY,
} from '@domain/repositories/commute-session.repository';
import {
  ICommuteRouteRepository,
  COMMUTE_ROUTE_REPOSITORY,
} from '@domain/repositories/commute-route.repository';
import {
  ICheckpointRecordRepository,
  CHECKPOINT_RECORD_REPOSITORY,
} from '@domain/repositories/checkpoint-record.repository';
import { CommuteSession, SessionStatus } from '@domain/entities/commute-session.entity';
import { CheckpointRecord } from '@domain/entities/checkpoint-record.entity';
import {
  StartSessionDto,
  RecordCheckpointDto,
  CompleteSessionDto,
  SessionResponseDto,
  CheckpointRecordResponseDto,
  SessionSummaryDto,
  CommuteHistoryResponseDto,
} from '@application/dto/commute.dto';

@Injectable()
export class ManageCommuteSessionUseCase {
  constructor(
    @Optional()
    @Inject(COMMUTE_SESSION_REPOSITORY)
    private readonly sessionRepository?: ICommuteSessionRepository,
    @Optional()
    @Inject(COMMUTE_ROUTE_REPOSITORY)
    private readonly routeRepository?: ICommuteRouteRepository,
    @Optional()
    @Inject(CHECKPOINT_RECORD_REPOSITORY)
    private readonly checkpointRecordRepository?: ICheckpointRecordRepository,
  ) {}

  async startSession(dto: StartSessionDto): Promise<SessionResponseDto> {
    if (!this.sessionRepository || !this.routeRepository) {
      throw new Error('Required repositories not available');
    }

    // Check if route exists
    const route = await this.routeRepository.findById(dto.routeId);
    if (!route) {
      throw new NotFoundException(`Route with ID ${dto.routeId} not found`);
    }

    // Check if user already has an in-progress session
    const existingSession = await this.sessionRepository.findInProgressByUserId(dto.userId);
    if (existingSession) {
      throw new BadRequestException('User already has an in-progress commute session');
    }

    const session = CommuteSession.start(dto.userId, dto.routeId, dto.weatherCondition);
    const savedSession = await this.sessionRepository.save(session);

    return this.toSessionResponseDto(savedSession, route.checkpoints.length);
  }

  async recordCheckpoint(dto: RecordCheckpointDto): Promise<SessionResponseDto> {
    if (!this.sessionRepository || !this.routeRepository || !this.checkpointRecordRepository) {
      throw new Error('Required repositories not available');
    }

    // Get session with records
    const session = await this.sessionRepository.findByIdWithRecords(dto.sessionId);
    if (!session) {
      throw new NotFoundException(`Session with ID ${dto.sessionId} not found`);
    }

    if (session.status !== SessionStatus.IN_PROGRESS) {
      throw new BadRequestException('Cannot record checkpoint for completed or cancelled session');
    }

    // Get route for checkpoint info
    const route = await this.routeRepository.findById(session.routeId);
    if (!route) {
      throw new NotFoundException(`Route not found`);
    }

    // Find the checkpoint in the route
    const checkpoint = route.checkpoints.find((cp) => cp.id === dto.checkpointId);
    if (!checkpoint) {
      throw new NotFoundException(`Checkpoint with ID ${dto.checkpointId} not found in route`);
    }

    // Check if this checkpoint was already recorded
    const alreadyRecorded = session.checkpointRecords.some(
      (r) => r.checkpointId === dto.checkpointId
    );
    if (alreadyRecorded) {
      throw new BadRequestException('Checkpoint already recorded for this session');
    }

    // Get the previous record (if any) for duration calculation
    const previousRecord =
      session.checkpointRecords.length > 0
        ? session.checkpointRecords[session.checkpointRecords.length - 1]
        : undefined;

    // Create checkpoint record
    const record = CheckpointRecord.create(
      dto.sessionId,
      dto.checkpointId,
      checkpoint.expectedDurationToNext || 0,
      checkpoint.expectedWaitTime,
      previousRecord,
      {
        actualWaitTime: dto.actualWaitTime,
        notes: dto.notes,
      }
    );

    const savedRecord = await this.checkpointRecordRepository.save(record);

    // Update session with new record
    const updatedSession = new CommuteSession(session.userId, session.routeId, {
      id: session.id,
      startedAt: session.startedAt,
      status: session.status,
      weatherCondition: session.weatherCondition,
      notes: session.notes,
      checkpointRecords: [...session.checkpointRecords, savedRecord],
      createdAt: session.createdAt,
    });

    await this.sessionRepository.update(updatedSession);

    // Reload session with updated records
    const reloadedSession = await this.sessionRepository.findByIdWithRecords(dto.sessionId);
    return this.toSessionResponseDto(reloadedSession!, route.checkpoints.length, route);
  }

  async completeSession(dto: CompleteSessionDto): Promise<SessionResponseDto> {
    if (!this.sessionRepository || !this.routeRepository) {
      throw new Error('Required repositories not available');
    }

    const session = await this.sessionRepository.findByIdWithRecords(dto.sessionId);
    if (!session) {
      throw new NotFoundException(`Session with ID ${dto.sessionId} not found`);
    }

    if (session.status !== SessionStatus.IN_PROGRESS) {
      throw new BadRequestException('Session is not in progress');
    }

    const route = await this.routeRepository.findById(session.routeId);

    // Complete the session
    const completedSession = session.complete();

    // Add notes if provided
    const finalSession = new CommuteSession(completedSession.userId, completedSession.routeId, {
      id: completedSession.id,
      startedAt: completedSession.startedAt,
      completedAt: completedSession.completedAt,
      totalDurationMinutes: completedSession.totalDurationMinutes,
      totalWaitMinutes: completedSession.totalWaitMinutes,
      totalDelayMinutes: completedSession.totalDelayMinutes,
      status: completedSession.status,
      weatherCondition: completedSession.weatherCondition,
      notes: dto.notes ?? completedSession.notes,
      checkpointRecords: completedSession.checkpointRecords,
      createdAt: completedSession.createdAt,
    });

    await this.sessionRepository.update(finalSession);

    const reloadedSession = await this.sessionRepository.findByIdWithRecords(dto.sessionId);
    return this.toSessionResponseDto(reloadedSession!, route?.checkpoints.length || 0, route);
  }

  async cancelSession(sessionId: string): Promise<void> {
    if (!this.sessionRepository) {
      throw new Error('Session repository not available');
    }

    const session = await this.sessionRepository.findById(sessionId);
    if (!session) {
      throw new NotFoundException(`Session with ID ${sessionId} not found`);
    }

    if (session.status !== SessionStatus.IN_PROGRESS) {
      throw new BadRequestException('Session is not in progress');
    }

    const cancelledSession = new CommuteSession(session.userId, session.routeId, {
      id: session.id,
      startedAt: session.startedAt,
      status: SessionStatus.CANCELLED,
      weatherCondition: session.weatherCondition,
      notes: session.notes,
      checkpointRecords: session.checkpointRecords,
      createdAt: session.createdAt,
    });

    await this.sessionRepository.update(cancelledSession);
  }

  async getSessionById(sessionId: string): Promise<SessionResponseDto> {
    if (!this.sessionRepository || !this.routeRepository) {
      throw new Error('Required repositories not available');
    }

    const session = await this.sessionRepository.findByIdWithRecords(sessionId);
    if (!session) {
      throw new NotFoundException(`Session with ID ${sessionId} not found`);
    }

    const route = await this.routeRepository.findById(session.routeId);
    return this.toSessionResponseDto(session, route?.checkpoints.length || 0, route);
  }

  async getInProgressSession(userId: string): Promise<SessionResponseDto | null> {
    if (!this.sessionRepository || !this.routeRepository) {
      throw new Error('Required repositories not available');
    }

    const session = await this.sessionRepository.findInProgressByUserId(userId);
    if (!session) {
      return null;
    }

    const route = await this.routeRepository.findById(session.routeId);
    return this.toSessionResponseDto(session, route?.checkpoints.length || 0, route);
  }

  async getHistory(userId: string, limit = 20, _offset = 0): Promise<CommuteHistoryResponseDto> {
    if (!this.sessionRepository || !this.routeRepository) {
      throw new Error('Required repositories not available');
    }

    const sessions = await this.sessionRepository.findByUserId(userId, limit + 1);
    const hasMore = sessions.length > limit;
    const resultSessions = sessions.slice(0, limit);

    // Batch-fetch route names to avoid N+1 queries
    const routeIds = [...new Set(resultSessions.map((s) => s.routeId))];
    const routes = await this.routeRepository.findByIds(routeIds);
    const routeMap = new Map(routes.map((r) => [r.id, r.name]));

    const sessionSummaries: SessionSummaryDto[] = resultSessions.map((session) => ({
      id: session.id,
      routeId: session.routeId,
      routeName: routeMap.get(session.routeId),
      startedAt: session.startedAt.toISOString(),
      completedAt: session.completedAt?.toISOString(),
      totalDurationMinutes: session.totalDurationMinutes,
      totalWaitMinutes: session.totalWaitMinutes,
      totalDelayMinutes: session.totalDelayMinutes,
      status: session.status,
      weatherCondition: session.weatherCondition,
      delayStatus: session.getDelayStatus(),
    }));

    return {
      userId,
      sessions: sessionSummaries,
      totalCount: sessions.length,
      hasMore,
    };
  }

  private toSessionResponseDto(
    session: CommuteSession,
    totalCheckpoints: number,
    route?: { checkpoints: Array<{ id: string; name: string }> }
  ): SessionResponseDto {
    // Create checkpoint name map
    const checkpointNameMap = new Map<string, string>();
    if (route) {
      route.checkpoints.forEach((cp) => checkpointNameMap.set(cp.id, cp.name));
    }

    return {
      id: session.id,
      userId: session.userId,
      routeId: session.routeId,
      startedAt: session.startedAt.toISOString(),
      completedAt: session.completedAt?.toISOString(),
      totalDurationMinutes: session.totalDurationMinutes,
      totalWaitMinutes: session.totalWaitMinutes,
      totalDelayMinutes: session.totalDelayMinutes,
      status: session.status,
      weatherCondition: session.weatherCondition,
      notes: session.notes,
      progress: session.getProgress(totalCheckpoints),
      delayStatus: session.getDelayStatus(),
      pureMovementTime: session.getPureMovementTime(),
      waitTimePercentage: session.getWaitTimePercentage(),
      checkpointRecords: session.checkpointRecords.map((r) =>
        this.toCheckpointRecordResponseDto(r, checkpointNameMap.get(r.checkpointId))
      ),
    };
  }

  private toCheckpointRecordResponseDto(
    record: CheckpointRecord,
    checkpointName?: string
  ): CheckpointRecordResponseDto {
    return {
      id: record.id,
      checkpointId: record.checkpointId,
      checkpointName,
      arrivedAt: record.arrivedAt.toISOString(),
      arrivalTimeString: record.getArrivalTimeString(),
      durationFromPrevious: record.durationFromPrevious,
      actualWaitTime: record.actualWaitTime,
      isDelayed: record.isDelayed,
      delayMinutes: record.delayMinutes,
      waitDelayMinutes: record.waitDelayMinutes,
      delayStatus: record.getDelayStatus(),
      waitDelayStatus: record.getWaitDelayStatus(),
      totalDuration: record.getTotalDuration(),
      notes: record.notes,
    };
  }
}
