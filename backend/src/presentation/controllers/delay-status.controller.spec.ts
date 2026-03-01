import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { DelayStatusController } from './delay-status.controller';
import { RouteDelayCheckService, DelayCheckResult } from '@application/services/route-delay-check.service';
import { AlternativeSuggestionService } from '@application/services/alternative-suggestion.service';
import { COMMUTE_ROUTE_REPOSITORY } from '@domain/repositories/commute-route.repository';
import { ALTERNATIVE_MAPPING_REPOSITORY } from '@domain/repositories/alternative-mapping.repository';
import { CommuteRoute, RouteType, RouteCheckpoint, CheckpointType } from '@domain/entities/commute-route.entity';
import { AlternativeMapping } from '@domain/entities/alternative-mapping.entity';

describe('DelayStatusController', () => {
  let controller: DelayStatusController;
  let mockDelayCheckService: jest.Mocked<RouteDelayCheckService>;
  let mockAlternativeSuggestionService: jest.Mocked<AlternativeSuggestionService>;
  let mockRouteRepository: jest.Mocked<any>;
  let mockMappingRepository: jest.Mocked<any>;

  const OWNER_ID = 'user-123';
  const OTHER_USER_ID = 'other-user';
  const ROUTE_ID = 'route-1';

  const mockRoute = new CommuteRoute(OWNER_ID, '출근 경로 - 2호선', RouteType.MORNING, {
    id: ROUTE_ID,
    totalExpectedDuration: 45,
    checkpoints: [
      new RouteCheckpoint(1, '강남역', CheckpointType.SUBWAY, {
        id: 'cp-1',
        lineInfo: '2호선',
        expectedWaitTime: 3,
      }),
    ],
  });

  const mockRequest = (userId: string) =>
    ({
      user: { userId, email: `${userId}@test.com` },
    }) as any;

  beforeEach(async () => {
    mockDelayCheckService = {
      checkRouteDelays: jest.fn(),
    } as any;

    mockAlternativeSuggestionService = {
      findAlternatives: jest.fn(),
    } as any;

    mockRouteRepository = {
      findById: jest.fn(),
    };

    mockMappingRepository = {
      findAll: jest.fn(),
      findActive: jest.fn(),
      findByStationAndLine: jest.fn(),
      findById: jest.fn(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DelayStatusController],
      providers: [
        { provide: RouteDelayCheckService, useValue: mockDelayCheckService },
        { provide: AlternativeSuggestionService, useValue: mockAlternativeSuggestionService },
        { provide: COMMUTE_ROUTE_REPOSITORY, useValue: mockRouteRepository },
        { provide: ALTERNATIVE_MAPPING_REPOSITORY, useValue: mockMappingRepository },
      ],
    }).compile();

    controller = module.get<DelayStatusController>(DelayStatusController);
  });

  describe('getDelayStatus', () => {
    const normalResult: DelayCheckResult = {
      segments: [
        {
          checkpointId: 'cp-1',
          checkpointName: '강남역',
          checkpointType: 'subway',
          lineInfo: '2호선',
          status: 'normal',
          expectedWaitMinutes: 3,
          estimatedWaitMinutes: 4,
          delayMinutes: 1,
          source: 'realtime_api',
          lastUpdated: '2026-03-02T07:30:00Z',
        },
      ],
      overallStatus: 'normal',
      totalExpectedDuration: 45,
      totalEstimatedDuration: 46,
      totalDelayMinutes: 1,
    };

    it('정상 경로의 지연 상태를 조회한다', async () => {
      mockRouteRepository.findById.mockResolvedValue(mockRoute);
      mockDelayCheckService.checkRouteDelays.mockResolvedValue(normalResult);
      mockAlternativeSuggestionService.findAlternatives.mockResolvedValue([]);

      const result = await controller.getDelayStatus(ROUTE_ID, mockRequest(OWNER_ID));

      expect(result.routeId).toBe(ROUTE_ID);
      expect(result.routeName).toBe('출근 경로 - 2호선');
      expect(result.overallStatus).toBe('normal');
      expect(result.segments).toHaveLength(1);
      expect(result.alternatives).toHaveLength(0);
      expect(result.checkedAt).toBeDefined();
    });

    it('지연 시 대안 경로를 포함하여 반환한다', async () => {
      const delayedResult: DelayCheckResult = {
        ...normalResult,
        overallStatus: 'delayed',
        segments: [
          {
            ...normalResult.segments[0],
            status: 'delayed',
            estimatedWaitMinutes: 14,
            delayMinutes: 11,
          },
        ],
        totalEstimatedDuration: 56,
        totalDelayMinutes: 11,
      };

      const mockAlternative = {
        id: 'alt-1',
        triggerSegment: 'cp-1',
        triggerReason: '2호선 강남역 11분 지연',
        description: '9호선 신논현역 경유',
        steps: [
          { action: 'walk' as const, from: '강남역', to: '신논현역', durationMinutes: 5 },
          { action: 'subway' as const, from: '신논현역', line: '9호선', durationMinutes: 3 },
        ],
        totalDurationMinutes: 8,
        originalDurationMinutes: 14,
        savingsMinutes: 6,
        walkingDistanceMeters: 400,
        confidence: 'high' as const,
      };

      mockRouteRepository.findById.mockResolvedValue(mockRoute);
      mockDelayCheckService.checkRouteDelays.mockResolvedValue(delayedResult);
      mockAlternativeSuggestionService.findAlternatives.mockResolvedValue([mockAlternative]);

      const result = await controller.getDelayStatus(ROUTE_ID, mockRequest(OWNER_ID));

      expect(result.overallStatus).toBe('delayed');
      expect(result.alternatives).toHaveLength(1);
      expect(result.alternatives[0].savingsMinutes).toBe(6);
      expect(result.totalDelayMinutes).toBe(11);
    });

    it('존재하지 않는 경로에 대해 404를 반환한다', async () => {
      mockRouteRepository.findById.mockResolvedValue(undefined);

      await expect(
        controller.getDelayStatus('non-existent', mockRequest(OWNER_ID)),
      ).rejects.toThrow(NotFoundException);
    });

    it('다른 사용자의 경로에 접근하면 403을 반환한다', async () => {
      mockRouteRepository.findById.mockResolvedValue(mockRoute);

      await expect(
        controller.getDelayStatus(ROUTE_ID, mockRequest(OTHER_USER_ID)),
      ).rejects.toThrow(ForbiddenException);

      expect(mockDelayCheckService.checkRouteDelays).not.toHaveBeenCalled();
    });

    it('응답에 totalExpectedDuration과 totalEstimatedDuration이 포함된다', async () => {
      mockRouteRepository.findById.mockResolvedValue(mockRoute);
      mockDelayCheckService.checkRouteDelays.mockResolvedValue(normalResult);
      mockAlternativeSuggestionService.findAlternatives.mockResolvedValue([]);

      const result = await controller.getDelayStatus(ROUTE_ID, mockRequest(OWNER_ID));

      expect(result.totalExpectedDuration).toBe(45);
      expect(result.totalEstimatedDuration).toBe(46);
    });
  });

  describe('listMappings', () => {
    it('모든 매핑 목록을 반환한다', async () => {
      const mappings = [
        new AlternativeMapping('강남', '2호선', '신논현', '9호선', 5, {
          id: 'map-1',
          walkingDistanceMeters: 400,
          description: '강남역 5번 출구 → 신논현역 4번 출구',
          isBidirectional: true,
          isActive: true,
        }),
      ];
      mockMappingRepository.findAll.mockResolvedValue(mappings);

      const result = await controller.listMappings();

      expect(result.mappings).toHaveLength(1);
      expect(result.mappings[0].fromStationName).toBe('강남');
      expect(result.mappings[0].toStationName).toBe('신논현');
    });

    it('매핑이 없으면 빈 배열을 반환한다', async () => {
      mockMappingRepository.findAll.mockResolvedValue([]);

      const result = await controller.listMappings();

      expect(result.mappings).toHaveLength(0);
    });
  });

  describe('createMapping', () => {
    it('새 매핑을 생성한다', async () => {
      const dto = {
        fromStationName: '강남',
        fromLine: '2호선',
        toStationName: '신논현',
        toLine: '9호선',
        walkingMinutes: 5,
        walkingDistanceMeters: 400,
        description: '강남역 5번 출구 → 신논현역 4번 출구',
      };

      const savedMapping = new AlternativeMapping(
        dto.fromStationName,
        dto.fromLine,
        dto.toStationName,
        dto.toLine,
        dto.walkingMinutes,
        {
          id: 'new-map-id',
          walkingDistanceMeters: dto.walkingDistanceMeters,
          description: dto.description,
          isBidirectional: true,
          isActive: true,
        },
      );

      mockMappingRepository.save.mockResolvedValue(savedMapping);

      const result = await controller.createMapping(dto);

      expect(result.id).toBe('new-map-id');
      expect(result.fromStationName).toBe('강남');
      expect(result.toStationName).toBe('신논현');
      expect(result.walkingMinutes).toBe(5);
      expect(mockMappingRepository.save).toHaveBeenCalled();
    });
  });
});
