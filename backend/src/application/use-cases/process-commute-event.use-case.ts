import {
  Injectable,
  Inject,
  Logger,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  ICommuteEventRepository,
  COMMUTE_EVENT_REPOSITORY,
} from '@domain/repositories/commute-event.repository';
import {
  ICommuteSessionRepository,
  COMMUTE_SESSION_REPOSITORY,
} from '@domain/repositories/commute-session.repository';
import {
  ICommuteRouteRepository,
  COMMUTE_ROUTE_REPOSITORY,
} from '@domain/repositories/commute-route.repository';
import {
  IUserPlaceRepository,
  USER_PLACE_REPOSITORY,
} from '@domain/repositories/user-place.repository';
import { CommuteEvent } from '@domain/entities/commute-event.entity';
import type { CommuteEventAction } from '@domain/entities/commute-event.entity';
import { CommuteSession, SessionStatus } from '@domain/entities/commute-session.entity';
import { RouteType } from '@domain/entities/commute-route.entity';
import type { PlaceType } from '@domain/entities/user-place.entity';
import { RecordCommuteEventDto } from '@application/dto/commute-event.dto';
import type {
  CommuteEventResponseDto,
  BatchCommuteEventsResponseDto,
  CommuteEventListResponseDto,
  CommuteEventDetailDto,
} from '@application/dto/commute-event.dto';

const DEBOUNCE_MS = 5 * 60 * 1000; // 5 minutes

@Injectable()
export class ProcessCommuteEventUseCase {
  private readonly logger = new Logger(ProcessCommuteEventUseCase.name);

  constructor(
    @Inject(COMMUTE_EVENT_REPOSITORY)
    private readonly eventRepository: ICommuteEventRepository,
    @Inject(COMMUTE_SESSION_REPOSITORY)
    private readonly sessionRepository: ICommuteSessionRepository,
    @Inject(COMMUTE_ROUTE_REPOSITORY)
    private readonly routeRepository: ICommuteRouteRepository,
    @Inject(USER_PLACE_REPOSITORY)
    private readonly placeRepository: IUserPlaceRepository,
  ) {}

  async processEvent(
    userId: string,
    dto: RecordCommuteEventDto
  ): Promise<CommuteEventResponseDto> {
    // 1. Validate place ownership
    const place = await this.placeRepository.findById(dto.placeId);
    if (!place) {
      throw new NotFoundException(`장소를 찾을 수 없습니다. (ID: ${dto.placeId})`);
    }
    if (place.userId !== userId) {
      throw new ForbiddenException('다른 사용자의 장소에 접근할 수 없습니다.');
    }

    // 2. Debouncing check
    const recentEvent = await this.eventRepository.findRecent(
      userId,
      dto.placeId,
      dto.eventType,
      DEBOUNCE_MS
    );

    if (recentEvent) {
      this.logger.debug(
        `Debounced event: ${place.placeType}/${dto.eventType} for user ${userId}`
      );
      // Save the event but mark as ignored
      const event = CommuteEvent.fromGeofence(
        userId,
        dto.placeId,
        dto.eventType,
        new Date(dto.triggeredAt),
        { latitude: dto.latitude, longitude: dto.longitude, accuracyM: dto.accuracyM }
      );
      const saved = await this.eventRepository.save(event);
      await this.eventRepository.markProcessed(saved.id);

      return {
        id: saved.id,
        userId: saved.userId,
        placeId: saved.placeId,
        placeType: place.placeType,
        eventType: saved.eventType,
        triggeredAt: saved.triggeredAt.toISOString(),
        action: 'ignored',
      };
    }

    // 3. Save the event
    const event = CommuteEvent.fromGeofence(
      userId,
      dto.placeId,
      dto.eventType,
      new Date(dto.triggeredAt),
      { latitude: dto.latitude, longitude: dto.longitude, accuracyM: dto.accuracyM }
    );
    const savedEvent = await this.eventRepository.save(event);

    // 4. Determine action based on time window rules
    const hour = new Date(dto.triggeredAt).getHours();
    const action = this.determineAction(place.placeType, dto.eventType, hour);

    this.logger.log(
      `Event: ${place.placeType}/${dto.eventType} at hour ${hour} -> action: ${action}`
    );

    // 5. Create or complete session based on action
    let sessionId: string | undefined;

    if (action === 'commute_started' || action === 'return_started') {
      sessionId = await this.createAutoSession(userId, place.placeType, action);
    } else if (action === 'commute_completed' || action === 'return_completed') {
      sessionId = await this.completeActiveSession(userId);
    }

    // 6. Update event with session ID and mark processed
    if (sessionId) {
      const updatedEvent = savedEvent.withSessionId(sessionId).markProcessed();
      await this.eventRepository.update(updatedEvent);
    } else {
      await this.eventRepository.markProcessed(savedEvent.id);
    }

    return {
      id: savedEvent.id,
      userId: savedEvent.userId,
      placeId: savedEvent.placeId,
      placeType: place.placeType,
      eventType: savedEvent.eventType,
      triggeredAt: savedEvent.triggeredAt.toISOString(),
      sessionId,
      action,
    };
  }

  async processBatch(
    userId: string,
    events: RecordCommuteEventDto[]
  ): Promise<BatchCommuteEventsResponseDto> {
    // Sort by triggeredAt ascending (oldest first)
    const sorted = [...events].sort(
      (a, b) => new Date(a.triggeredAt).getTime() - new Date(b.triggeredAt).getTime()
    );

    const results: CommuteEventResponseDto[] = [];
    let ignored = 0;

    for (const eventDto of sorted) {
      const result = await this.processEvent(userId, eventDto);
      results.push(result);
      if (result.action === 'ignored') {
        ignored++;
      }
    }

    return {
      processed: results.length - ignored,
      ignored,
      results,
    };
  }

  async getEventsByUserId(
    userId: string,
    limit = 50
  ): Promise<CommuteEventListResponseDto> {
    const events = await this.eventRepository.findByUserId(userId, limit);

    // Batch-fetch all user places to avoid N+1 query
    const allPlaces = await this.placeRepository.findByUserId(userId);
    const placeMap = new Map<string, { placeType: string; label: string }>();
    for (const place of allPlaces) {
      placeMap.set(place.id, { placeType: place.placeType, label: place.label });
    }

    const details: CommuteEventDetailDto[] = events.map((e) => {
      const placeInfo = placeMap.get(e.placeId);
      return {
        id: e.id,
        placeId: e.placeId,
        placeType: placeInfo?.placeType || 'unknown',
        placeLabel: placeInfo?.label || '',
        eventType: e.eventType,
        triggeredAt: e.triggeredAt.toISOString(),
        recordedAt: e.recordedAt.toISOString(),
        latitude: e.latitude,
        longitude: e.longitude,
        accuracyM: e.accuracyM,
        sessionId: e.sessionId,
        source: e.source,
        isProcessed: e.isProcessed,
      };
    });

    return {
      userId,
      events: details,
      totalCount: details.length,
    };
  }

  private determineAction(
    placeType: PlaceType,
    eventType: 'enter' | 'exit',
    hour: number
  ): CommuteEventAction {
    // Morning commute: home exit between 05:00~11:59
    if (placeType === 'home' && eventType === 'exit' && hour >= 5 && hour < 12) {
      return 'commute_started';
    }
    // Morning commute completion: work enter between 05:00~13:59
    if (placeType === 'work' && eventType === 'enter' && hour >= 5 && hour < 14) {
      return 'commute_completed';
    }
    // Evening return: work exit between 14:00~23:59
    if (placeType === 'work' && eventType === 'exit' && hour >= 14 && hour < 24) {
      return 'return_started';
    }
    // Evening return completion: home enter between 14:00~23:59
    if (placeType === 'home' && eventType === 'enter' && hour >= 14 && hour < 24) {
      return 'return_completed';
    }
    // Outside time windows
    return 'ignored';
  }

  private async createAutoSession(
    userId: string,
    placeType: PlaceType,
    action: 'commute_started' | 'return_started'
  ): Promise<string | undefined> {
    // Check for existing in-progress session
    const existingSession = await this.sessionRepository.findInProgressByUserId(userId);
    if (existingSession) {
      this.logger.warn(
        `User ${userId} already has in-progress session ${existingSession.id}, skipping auto session creation`
      );
      return undefined;
    }

    // Find preferred route
    const routeType = action === 'commute_started' ? RouteType.MORNING : RouteType.EVENING;
    const preferredRoute = await this.routeRepository.findPreferredByUserId(userId, routeType);

    if (!preferredRoute) {
      // Find any route of the type, or any route at all
      const routes = await this.routeRepository.findByUserIdAndType(userId, routeType);
      if (routes.length === 0) {
        const allRoutes = await this.routeRepository.findByUserId(userId);
        if (allRoutes.length === 0) {
          this.logger.warn(`User ${userId} has no routes, cannot create auto session`);
          return undefined;
        }
        // Use the most recent route
        const routeId = allRoutes[0]!.id;
        return this.doCreateSession(userId, routeId, action);
      }
      return this.doCreateSession(userId, routes[0]!.id, action);
    }

    return this.doCreateSession(userId, preferredRoute.id, action);
  }

  private async doCreateSession(
    userId: string,
    routeId: string,
    action: 'commute_started' | 'return_started'
  ): Promise<string> {
    const notes = action === 'commute_started' ? '[auto] 출근' : '[auto] 퇴근';
    const session = new CommuteSession(userId, routeId, {
      startedAt: new Date(),
      status: SessionStatus.IN_PROGRESS,
      notes,
    });
    const saved = await this.sessionRepository.save(session);
    this.logger.log(`Auto session created: ${saved.id} (${notes}) for user ${userId}`);
    return saved.id;
  }

  private async completeActiveSession(userId: string): Promise<string | undefined> {
    const session = await this.sessionRepository.findInProgressByUserId(userId);
    if (!session) {
      this.logger.debug(`No in-progress session found for user ${userId}, event only`);
      return undefined;
    }

    // Check for stale sessions (24+ hours)
    const sessionAge = Date.now() - session.startedAt.getTime();
    const twentyFourHours = 24 * 60 * 60 * 1000;
    if (sessionAge > twentyFourHours) {
      this.logger.warn(
        `Stale session ${session.id} (${Math.round(sessionAge / 3600000)}h old), cancelling instead of completing`
      );
      const cancelled = new CommuteSession(session.userId, session.routeId, {
        id: session.id,
        startedAt: session.startedAt,
        status: SessionStatus.CANCELLED,
        notes: session.notes ? `${session.notes} [auto-cancelled: stale]` : '[auto-cancelled: stale]',
        checkpointRecords: session.checkpointRecords,
        createdAt: session.createdAt,
      });
      await this.sessionRepository.update(cancelled);
      return undefined;
    }

    const completed = session.complete();
    const finalSession = new CommuteSession(completed.userId, completed.routeId, {
      id: completed.id,
      startedAt: completed.startedAt,
      completedAt: completed.completedAt,
      totalDurationMinutes: completed.totalDurationMinutes,
      totalWaitMinutes: completed.totalWaitMinutes,
      totalDelayMinutes: completed.totalDelayMinutes,
      status: completed.status,
      weatherCondition: completed.weatherCondition,
      notes: completed.notes,
      checkpointRecords: completed.checkpointRecords,
      createdAt: completed.createdAt,
    });
    await this.sessionRepository.update(finalSession);
    this.logger.log(`Auto session completed: ${finalSession.id} for user ${userId}`);
    return finalSession.id;
  }
}
