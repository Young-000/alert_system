import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { BehaviorController } from './behavior.controller';
import { TrackBehaviorUseCase } from '@application/use-cases/track-behavior.use-case';
import { PredictOptimalDepartureUseCase } from '@application/use-cases/predict-optimal-departure.use-case';
import { PredictionEngineService } from '@application/services/prediction-engine.service';
import { EnhancedPatternAnalysisService } from '@application/services/enhanced-pattern-analysis.service';
import { BehaviorEventType } from '@domain/entities/behavior-event.entity';

describe('BehaviorController', () => {
  let controller: BehaviorController;
  let trackBehaviorUseCase: jest.Mocked<TrackBehaviorUseCase>;
  let predictOptimalDepartureUseCase: jest.Mocked<PredictOptimalDepartureUseCase>;
  let mockPredictionEngine: any;
  let mockEnhancedAnalysis: any;
  let mockUserPatternRepo: any;
  let mockCommuteRecordRepo: any;

  const OWNER_ID = 'user-123';
  const OTHER_USER_ID = 'other-user';

  const mockRequest = (userId: string) => ({
    user: { userId, email: `${userId}@test.com` },
  }) as any;

  beforeEach(async () => {
    trackBehaviorUseCase = {
      trackEvent: jest.fn(),
      trackDepartureConfirmation: jest.fn(),
      trackNotificationOpened: jest.fn(),
    } as any;

    predictOptimalDepartureUseCase = {
      execute: jest.fn(),
    } as any;

    mockUserPatternRepo = {
      findByUserId: jest.fn(),
    };

    mockCommuteRecordRepo = {
      findByUserId: jest.fn(),
    };

    mockPredictionEngine = {
      predict: jest.fn(),
      getInsights: jest.fn(),
    };

    mockEnhancedAnalysis = {
      runFullAnalysis: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BehaviorController],
      providers: [
        { provide: TrackBehaviorUseCase, useValue: trackBehaviorUseCase },
        { provide: PredictOptimalDepartureUseCase, useValue: predictOptimalDepartureUseCase },
        { provide: 'USER_PATTERN_REPOSITORY', useValue: mockUserPatternRepo },
        { provide: 'COMMUTE_RECORD_REPOSITORY', useValue: mockCommuteRecordRepo },
        { provide: PredictionEngineService, useValue: mockPredictionEngine },
        { provide: EnhancedPatternAnalysisService, useValue: mockEnhancedAnalysis },
      ],
    }).compile();

    controller = module.get<BehaviorController>(BehaviorController);
  });

  describe('trackEvent', () => {
    it('알려진 이벤트 타입으로 추적 성공', async () => {
      trackBehaviorUseCase.trackEvent.mockResolvedValue(undefined);

      const dto = {
        userId: OWNER_ID,
        eventType: 'notification_received',
        alertId: 'alert-1',
      };
      const result = await controller.trackEvent(dto, mockRequest(OWNER_ID));

      expect(trackBehaviorUseCase.trackEvent).toHaveBeenCalledWith({
        userId: OWNER_ID,
        eventType: BehaviorEventType.NOTIFICATION_RECEIVED,
        alertId: 'alert-1',
        metadata: undefined,
        source: undefined,
      });
      expect(result).toEqual({ success: true });
    });

    it('알 수 없는 이벤트 타입 시 success: false 반환 (에러 던지지 않음)', async () => {
      const dto = {
        userId: OWNER_ID,
        eventType: 'unknown_event_type',
      };
      const result = await controller.trackEvent(dto, mockRequest(OWNER_ID));

      expect(result).toEqual({ success: false });
      expect(trackBehaviorUseCase.trackEvent).not.toHaveBeenCalled();
    });

    it('다른 사용자의 행동 기록 시 ForbiddenException', async () => {
      const dto = { userId: OWNER_ID, eventType: 'notification_received' };

      await expect(
        controller.trackEvent(dto, mockRequest(OTHER_USER_ID)),
      ).rejects.toThrow(ForbiddenException);

      expect(trackBehaviorUseCase.trackEvent).not.toHaveBeenCalled();
    });

    it('모든 알려진 이벤트 타입이 매핑된다', async () => {
      trackBehaviorUseCase.trackEvent.mockResolvedValue(undefined);

      const knownTypes = [
        'notification_received',
        'notification_opened',
        'notification_dismissed',
        'departure_confirmed',
        'transit_info_viewed',
        'alert_created',
        'alert_modified',
      ];

      for (const eventType of knownTypes) {
        const dto = { userId: OWNER_ID, eventType };
        const result = await controller.trackEvent(dto, mockRequest(OWNER_ID));
        expect(result).toEqual({ success: true });
      }

      expect(trackBehaviorUseCase.trackEvent).toHaveBeenCalledTimes(knownTypes.length);
    });
  });

  describe('confirmDeparture', () => {
    const departureDto = {
      userId: OWNER_ID,
      alertId: 'alert-1',
      source: 'push' as const,
      weatherCondition: '맑음',
      transitDelayMinutes: 5,
    };

    it('출발 확인 기록 성공', async () => {
      trackBehaviorUseCase.trackDepartureConfirmation.mockResolvedValue(undefined);

      const result = await controller.confirmDeparture(departureDto, mockRequest(OWNER_ID));

      expect(trackBehaviorUseCase.trackDepartureConfirmation).toHaveBeenCalledWith({
        userId: OWNER_ID,
        alertId: 'alert-1',
        source: 'push',
        weatherCondition: '맑음',
        transitDelayMinutes: 5,
      });
      expect(result).toEqual({ success: true });
    });

    it('다른 사용자의 출발 확인 시 ForbiddenException', async () => {
      await expect(
        controller.confirmDeparture(departureDto, mockRequest(OTHER_USER_ID)),
      ).rejects.toThrow(ForbiddenException);

      expect(trackBehaviorUseCase.trackDepartureConfirmation).not.toHaveBeenCalled();
    });
  });

  describe('notificationOpened', () => {
    const openedDto = {
      userId: OWNER_ID,
      alertId: 'alert-1',
      notificationId: 'notif-1',
    };

    it('알림 열기 기록 성공', async () => {
      trackBehaviorUseCase.trackNotificationOpened.mockResolvedValue(undefined);

      const result = await controller.notificationOpened(openedDto, mockRequest(OWNER_ID));

      expect(trackBehaviorUseCase.trackNotificationOpened).toHaveBeenCalledWith(
        OWNER_ID,
        'alert-1',
        'notif-1',
      );
      expect(result).toEqual({ success: true });
    });

    it('다른 사용자의 알림 열기 기록 시 ForbiddenException', async () => {
      await expect(
        controller.notificationOpened(openedDto, mockRequest(OTHER_USER_ID)),
      ).rejects.toThrow(ForbiddenException);

      expect(trackBehaviorUseCase.trackNotificationOpened).not.toHaveBeenCalled();
    });
  });

  describe('getUserPatterns', () => {
    it('사용자 패턴 조회 성공', async () => {
      const mockPatterns = [
        { id: 'p-1', userId: OWNER_ID, confidence: 0.8 },
      ];
      mockUserPatternRepo.findByUserId.mockResolvedValue(mockPatterns);

      const result = await controller.getUserPatterns(OWNER_ID, mockRequest(OWNER_ID));

      expect(mockUserPatternRepo.findByUserId).toHaveBeenCalledWith(OWNER_ID);
      expect(result).toEqual({ patterns: mockPatterns });
    });

    it('다른 사용자의 패턴 조회 시 ForbiddenException', async () => {
      await expect(
        controller.getUserPatterns(OWNER_ID, mockRequest(OTHER_USER_ID)),
      ).rejects.toThrow(ForbiddenException);

      expect(mockUserPatternRepo.findByUserId).not.toHaveBeenCalled();
    });

    it('패턴 리포지토리 미주입 시 폴백 응답 반환', async () => {
      const module = await Test.createTestingModule({
        controllers: [BehaviorController],
        providers: [
          { provide: TrackBehaviorUseCase, useValue: trackBehaviorUseCase },
        ],
      }).compile();
      const ctrl = module.get<BehaviorController>(BehaviorController);

      const result = await ctrl.getUserPatterns(OWNER_ID, mockRequest(OWNER_ID));

      expect(result).toEqual({
        patterns: [],
        message: 'Pattern repository not available',
      });
    });
  });

  describe('getCommuteHistory', () => {
    it('통근 기록 조회 성공 (기본 limit)', async () => {
      const mockRecords = [{ id: 'r-1', userId: OWNER_ID }];
      mockCommuteRecordRepo.findByUserId.mockResolvedValue(mockRecords);

      const result = await controller.getCommuteHistory(OWNER_ID, undefined, mockRequest(OWNER_ID));

      expect(mockCommuteRecordRepo.findByUserId).toHaveBeenCalledWith(OWNER_ID, 30);
      expect(result).toEqual({ records: mockRecords });
    });

    it('limit 쿼리 파라미터 파싱', async () => {
      mockCommuteRecordRepo.findByUserId.mockResolvedValue([]);

      await controller.getCommuteHistory(OWNER_ID, '10', mockRequest(OWNER_ID));

      expect(mockCommuteRecordRepo.findByUserId).toHaveBeenCalledWith(OWNER_ID, 10);
    });

    it('다른 사용자의 통근 기록 조회 시 ForbiddenException', async () => {
      await expect(
        controller.getCommuteHistory(OWNER_ID, undefined, mockRequest(OTHER_USER_ID)),
      ).rejects.toThrow(ForbiddenException);
    });

    it('통근 기록 리포지토리 미주입 시 폴백 응답 반환', async () => {
      const module = await Test.createTestingModule({
        controllers: [BehaviorController],
        providers: [
          { provide: TrackBehaviorUseCase, useValue: trackBehaviorUseCase },
        ],
      }).compile();
      const ctrl = module.get<BehaviorController>(BehaviorController);

      const result = await ctrl.getCommuteHistory(OWNER_ID, undefined, mockRequest(OWNER_ID));

      expect(result).toEqual({
        records: [],
        message: 'Commute record repository not available',
      });
    });
  });

  describe('predictOptimalDeparture', () => {
    it('최적 출발 시간 예측 성공 (서비스 주입됨)', async () => {
      const mockPrediction = {
        optimalDepartureTime: '08:15',
        confidence: 0.85,
        estimatedDuration: 42,
      };
      const mockPredictUseCase = { execute: jest.fn().mockResolvedValue(mockPrediction) };

      // @Optional() 의존성은 NestJS DI가 아닌 직접 생성으로 주입
      const ctrl = new BehaviorController(
        trackBehaviorUseCase,
        mockPredictUseCase as any,
        mockUserPatternRepo,
        mockCommuteRecordRepo,
        null,
        null,
      );

      const result = await ctrl.predictOptimalDeparture(
        OWNER_ID,
        'alert-1',
        '맑음',
        '5',
        'false',
        '20',
        mockRequest(OWNER_ID),
      );

      expect(mockPredictUseCase.execute).toHaveBeenCalledWith(
        OWNER_ID,
        'alert-1',
        {
          weather: '맑음',
          transitDelayMinutes: 5,
          isRaining: false,
          temperature: 20,
        },
      );
      expect(result).toEqual(mockPrediction);
    });

    it('조건 파라미터 없이 호출 성공', async () => {
      const mockPrediction = { optimalDepartureTime: '08:00', confidence: 0.7 };
      const mockPredictUseCase = { execute: jest.fn().mockResolvedValue(mockPrediction) };

      const ctrl = new BehaviorController(
        trackBehaviorUseCase,
        mockPredictUseCase as any,
        mockUserPatternRepo,
        mockCommuteRecordRepo,
        null,
        null,
      );

      await ctrl.predictOptimalDeparture(
        OWNER_ID,
        'alert-1',
        undefined,
        undefined,
        undefined,
        undefined,
        mockRequest(OWNER_ID),
      );

      expect(mockPredictUseCase.execute).toHaveBeenCalledWith(
        OWNER_ID,
        'alert-1',
        {},
      );
    });

    it('다른 사용자의 예측 조회 시 ForbiddenException', async () => {
      await expect(
        controller.predictOptimalDeparture(
          OWNER_ID,
          'alert-1',
          undefined,
          undefined,
          undefined,
          undefined,
          mockRequest(OTHER_USER_ID),
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('예측 서비스 미주입 시 에러 응답 반환', async () => {
      const module = await Test.createTestingModule({
        controllers: [BehaviorController],
        providers: [
          { provide: TrackBehaviorUseCase, useValue: trackBehaviorUseCase },
        ],
      }).compile();
      const ctrl = module.get<BehaviorController>(BehaviorController);

      const result = await ctrl.predictOptimalDeparture(
        OWNER_ID,
        'alert-1',
        undefined,
        undefined,
        undefined,
        undefined,
        mockRequest(OWNER_ID),
      );

      expect(result).toEqual({ error: 'Prediction service not available' });
    });
  });

  describe('getBehaviorAnalytics', () => {
    it('행동 분석 요약 조회 성공', async () => {
      const mockPatterns = [
        { id: 'p-1', userId: OWNER_ID, confidence: 0.8 },
        { id: 'p-2', userId: OWNER_ID, confidence: 0.6 },
      ];
      const mockRecords = new Array(7).fill({ id: 'r', userId: OWNER_ID });

      mockUserPatternRepo.findByUserId.mockResolvedValue(mockPatterns);
      mockCommuteRecordRepo.findByUserId.mockResolvedValue(mockRecords);

      const result = await controller.getBehaviorAnalytics(OWNER_ID, mockRequest(OWNER_ID));

      expect(result.totalPatterns).toBe(2);
      expect(result.totalCommuteRecords).toBe(7);
      expect(result.averageConfidence).toBe(0.7);
      expect(result.hasEnoughData).toBe(true);
    });

    it('데이터가 5개 미만이면 hasEnoughData가 false', async () => {
      mockUserPatternRepo.findByUserId.mockResolvedValue([]);
      mockCommuteRecordRepo.findByUserId.mockResolvedValue([{ id: 'r-1' }]);

      const result = await controller.getBehaviorAnalytics(OWNER_ID, mockRequest(OWNER_ID));

      expect(result.hasEnoughData).toBe(false);
      expect(result.totalCommuteRecords).toBe(1);
    });

    it('패턴이 없으면 averageConfidence가 0', async () => {
      mockUserPatternRepo.findByUserId.mockResolvedValue([]);
      mockCommuteRecordRepo.findByUserId.mockResolvedValue([]);

      const result = await controller.getBehaviorAnalytics(OWNER_ID, mockRequest(OWNER_ID));

      expect(result.averageConfidence).toBe(0);
      expect(result.totalPatterns).toBe(0);
    });

    it('다른 사용자의 분석 조회 시 ForbiddenException', async () => {
      await expect(
        controller.getBehaviorAnalytics(OWNER_ID, mockRequest(OTHER_USER_ID)),
      ).rejects.toThrow(ForbiddenException);
    });

    it('리포지토리 미주입 시 빈 배열로 동작', async () => {
      const module = await Test.createTestingModule({
        controllers: [BehaviorController],
        providers: [
          { provide: TrackBehaviorUseCase, useValue: trackBehaviorUseCase },
        ],
      }).compile();
      const ctrl = module.get<BehaviorController>(BehaviorController);

      const result = await ctrl.getBehaviorAnalytics(OWNER_ID, mockRequest(OWNER_ID));

      expect(result).toEqual({
        totalPatterns: 0,
        totalCommuteRecords: 0,
        averageConfidence: 0,
        hasEnoughData: false,
      });
    });
  });

  describe('getPrediction', () => {
    const mockPredictionResult = {
      departureTime: '08:10',
      departureRange: { early: '07:55', late: '08:25' },
      confidence: 0.75,
      tier: 'basic' as const,
      factors: [{ type: 'base_pattern' as const, label: '기본 패턴', impact: 0, description: '5개 기록 기반', confidence: 0.6 }],
      insights: [],
      dataStatus: { totalRecords: 5, recordsUsed: 5, nextTierAt: 10, nextTierName: 'day_aware' },
    };

    it('예측 결과를 반환한다', async () => {
      mockPredictionEngine.predict!.mockResolvedValue(mockPredictionResult);

      const result = await controller.getPrediction(
        OWNER_ID, undefined, undefined, undefined, undefined, mockRequest(OWNER_ID),
      );

      expect(mockPredictionEngine.predict).toHaveBeenCalledWith(OWNER_ID, {});
      expect(result).toEqual(mockPredictionResult);
    });

    it('쿼리 파라미터를 올바르게 전달한다', async () => {
      mockPredictionEngine.predict!.mockResolvedValue(mockPredictionResult);

      await controller.getPrediction(
        OWNER_ID, 'rain', '15', '10', '2026-03-02', mockRequest(OWNER_ID),
      );

      expect(mockPredictionEngine.predict).toHaveBeenCalledWith(OWNER_ID, {
        weather: 'rain',
        temperature: 15,
        transitDelayMinutes: 10,
        targetDate: new Date('2026-03-02'),
      });
    });

    it('다른 사용자의 예측 조회 시 ForbiddenException', async () => {
      await expect(
        controller.getPrediction(
          OWNER_ID, undefined, undefined, undefined, undefined, mockRequest(OTHER_USER_ID),
        ),
      ).rejects.toThrow(ForbiddenException);

      expect(mockPredictionEngine.predict).not.toHaveBeenCalled();
    });

    it('엔진 미주입 시 에러 응답 반환', async () => {
      const ctrl = new BehaviorController(
        trackBehaviorUseCase,
        predictOptimalDepartureUseCase,
        mockUserPatternRepo,
        mockCommuteRecordRepo,
        null, // no prediction engine
        null,
      );

      const result = await ctrl.getPrediction(
        OWNER_ID, undefined, undefined, undefined, undefined, mockRequest(OWNER_ID),
      );

      expect(result).toEqual({ error: 'Prediction engine not available' });
    });
  });

  describe('getInsights', () => {
    const mockInsightsResult = {
      dayOfWeek: null,
      weatherImpact: null,
      overallStats: {
        totalRecords: 3,
        trackingSince: '2026-02-01T00:00:00.000Z',
        avgDepartureTime: '08:00',
        currentTier: 'cold_start',
        predictionAccuracy: 30,
      },
    };

    it('인사이트를 반환한다', async () => {
      mockPredictionEngine.getInsights!.mockResolvedValue(mockInsightsResult);

      const result = await controller.getInsights(OWNER_ID, mockRequest(OWNER_ID));

      expect(mockPredictionEngine.getInsights).toHaveBeenCalledWith(OWNER_ID);
      expect(result).toEqual(mockInsightsResult);
    });

    it('다른 사용자의 인사이트 조회 시 ForbiddenException', async () => {
      await expect(
        controller.getInsights(OWNER_ID, mockRequest(OTHER_USER_ID)),
      ).rejects.toThrow(ForbiddenException);

      expect(mockPredictionEngine.getInsights).not.toHaveBeenCalled();
    });

    it('엔진 미주입 시 에러 응답 반환', async () => {
      const ctrl = new BehaviorController(
        trackBehaviorUseCase,
        predictOptimalDepartureUseCase,
        mockUserPatternRepo,
        mockCommuteRecordRepo,
        null,
        null,
      );

      const result = await ctrl.getInsights(OWNER_ID, mockRequest(OWNER_ID));

      expect(result).toEqual({ error: 'Prediction engine not available' });
    });
  });

  describe('triggerAnalysis', () => {
    it('분석을 트리거하고 결과를 반환한다', async () => {
      mockEnhancedAnalysis.runFullAnalysis!.mockResolvedValue({
        dayOfWeek: { segments: [], lastCalculated: '' },
        weatherSensitivity: null,
        seasonalTrend: null,
      });

      const result = await controller.triggerAnalysis(OWNER_ID, mockRequest(OWNER_ID));

      expect(mockEnhancedAnalysis.runFullAnalysis).toHaveBeenCalledWith(OWNER_ID);
      expect(result.success).toBe(true);
      expect(result.message).toContain('요일=yes');
      expect(result.message).toContain('날씨=no');
    });

    it('다른 사용자의 분석 요청 시 ForbiddenException', async () => {
      await expect(
        controller.triggerAnalysis(OWNER_ID, mockRequest(OTHER_USER_ID)),
      ).rejects.toThrow(ForbiddenException);

      expect(mockEnhancedAnalysis.runFullAnalysis).not.toHaveBeenCalled();
    });

    it('서비스 미주입 시 에러 응답 반환', async () => {
      const ctrl = new BehaviorController(
        trackBehaviorUseCase,
        predictOptimalDepartureUseCase,
        mockUserPatternRepo,
        mockCommuteRecordRepo,
        null,
        null,
      );

      const result = await ctrl.triggerAnalysis(OWNER_ID, mockRequest(OWNER_ID));

      expect(result).toEqual({ success: false, message: 'Analysis service not available' });
    });
  });
});
