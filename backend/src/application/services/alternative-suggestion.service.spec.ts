import { AlternativeSuggestionService } from './alternative-suggestion.service';
import { IAlternativeMappingRepository } from '@domain/repositories/alternative-mapping.repository';
import { AlternativeMapping } from '@domain/entities/alternative-mapping.entity';
import { ISubwayApiClient } from '@infrastructure/external-apis/subway-api.client';
import { SubwayArrival } from '@domain/entities/subway-arrival.entity';
import { DelaySegmentDto } from '@application/dto/delay-status.dto';

describe('AlternativeSuggestionService', () => {
  let service: AlternativeSuggestionService;
  let mockMappingRepo: jest.Mocked<IAlternativeMappingRepository>;
  let mockSubwayClient: jest.Mocked<ISubwayApiClient>;

  beforeEach(() => {
    mockMappingRepo = {
      findAll: jest.fn(),
      findActive: jest.fn(),
      findByStationAndLine: jest.fn(),
      findById: jest.fn(),
      save: jest.fn(),
    };
    mockSubwayClient = {
      getSubwayArrival: jest.fn(),
    };
    service = new AlternativeSuggestionService(mockMappingRepo, mockSubwayClient);
  });

  function createDelayedSegment(overrides?: Partial<DelaySegmentDto>): DelaySegmentDto {
    return {
      checkpointId: 'cp-1',
      checkpointName: '강남역',
      checkpointType: 'subway',
      lineInfo: '2호선',
      status: 'delayed',
      expectedWaitMinutes: 3,
      estimatedWaitMinutes: 14,
      delayMinutes: 11,
      source: 'realtime_api',
      lastUpdated: new Date().toISOString(),
      ...overrides,
    };
  }

  function createMapping(overrides?: Partial<ConstructorParameters<typeof AlternativeMapping>[5]>): AlternativeMapping {
    return new AlternativeMapping(
      '강남',
      '2호선',
      '신논현',
      '9호선',
      5,
      {
        id: 'map-1',
        walkingDistanceMeters: 400,
        description: '강남역 5번 출구 → 신논현역 4번 출구',
        isBidirectional: true,
        isActive: true,
        ...overrides,
      },
    );
  }

  describe('findAlternatives', () => {
    it('지연이 5분 미만이면 대안을 제안하지 않는다', async () => {
      const segment = createDelayedSegment({ delayMinutes: 3 });

      const result = await service.findAlternatives([segment]);

      expect(result).toHaveLength(0);
      expect(mockMappingRepo.findByStationAndLine).not.toHaveBeenCalled();
    });

    it('지연이 5분 이상이면 대안을 검색한다', async () => {
      const segment = createDelayedSegment({ delayMinutes: 11 });
      const mapping = createMapping();

      mockMappingRepo.findByStationAndLine.mockResolvedValue([mapping]);
      // Alternative station wait: 3 minutes
      mockSubwayClient.getSubwayArrival.mockResolvedValue([
        new SubwayArrival('st-alt', '1009', '상행', 180, '여의도'),
      ]);

      const result = await service.findAlternatives([segment]);

      expect(result).toHaveLength(1);
      expect(result[0].triggerSegment).toBe('cp-1');
      expect(result[0].description).toContain('신논현');
      expect(result[0].description).toContain('9호선');
    });

    it('절약 시간이 양수일 때만 대안을 제안한다', async () => {
      const segment = createDelayedSegment({
        delayMinutes: 5,
        estimatedWaitMinutes: 8,
      });
      const mapping = createMapping();

      mockMappingRepo.findByStationAndLine.mockResolvedValue([mapping]);
      // Walk 5min + wait 5min = 10min > current 8min -> no savings
      mockSubwayClient.getSubwayArrival.mockResolvedValue([
        new SubwayArrival('st-alt', '1009', '상행', 300, '여의도'),
      ]);

      const result = await service.findAlternatives([segment]);

      expect(result).toHaveLength(0);
    });

    it('절약 시간을 올바르게 계산한다', async () => {
      const segment = createDelayedSegment({
        delayMinutes: 11,
        estimatedWaitMinutes: 14,
      });
      const mapping = createMapping();

      mockMappingRepo.findByStationAndLine.mockResolvedValue([mapping]);
      // Walk 5min + alt wait 3min = 8min total vs current 14min = 6min savings
      mockSubwayClient.getSubwayArrival.mockResolvedValue([
        new SubwayArrival('st-alt', '1009', '상행', 180, '여의도'),
      ]);

      const result = await service.findAlternatives([segment]);

      expect(result).toHaveLength(1);
      expect(result[0].savingsMinutes).toBe(6);
      expect(result[0].totalDurationMinutes).toBe(8);
      expect(result[0].originalDurationMinutes).toBe(14);
    });

    it('매핑이 없으면 빈 배열을 반환한다', async () => {
      const segment = createDelayedSegment({ delayMinutes: 10 });

      mockMappingRepo.findByStationAndLine.mockResolvedValue([]);

      const result = await service.findAlternatives([segment]);

      expect(result).toHaveLength(0);
    });

    it('대안 역 실시간 데이터가 있으면 confidence는 high이다', async () => {
      const segment = createDelayedSegment();
      const mapping = createMapping();

      mockMappingRepo.findByStationAndLine.mockResolvedValue([mapping]);
      mockSubwayClient.getSubwayArrival.mockResolvedValue([
        new SubwayArrival('st-alt', '1009', '상행', 180, '여의도'),
      ]);

      const result = await service.findAlternatives([segment]);

      expect(result).toHaveLength(1);
      expect(result[0].confidence).toBe('high');
    });

    it('대안 역 API 오류 시 confidence는 low이다', async () => {
      const segment = createDelayedSegment({
        estimatedWaitMinutes: 20,
        delayMinutes: 17,
      });
      const mapping = createMapping();

      mockMappingRepo.findByStationAndLine.mockResolvedValue([mapping]);
      mockSubwayClient.getSubwayArrival.mockRejectedValue(new Error('API fail'));

      const result = await service.findAlternatives([segment]);

      // Walk 5min + default 3min = 8min vs 20min = 12min savings
      expect(result).toHaveLength(1);
      expect(result[0].confidence).toBe('low');
    });

    it('대안 경로의 steps를 올바르게 생성한다', async () => {
      const segment = createDelayedSegment();
      const mapping = createMapping();

      mockMappingRepo.findByStationAndLine.mockResolvedValue([mapping]);
      mockSubwayClient.getSubwayArrival.mockResolvedValue([
        new SubwayArrival('st-alt', '1009', '상행', 180, '여의도'),
      ]);

      const result = await service.findAlternatives([segment]);

      expect(result[0].steps).toHaveLength(2);
      expect(result[0].steps[0]).toEqual({
        action: 'walk',
        from: '강남역',
        to: '신논현역',
        durationMinutes: 5,
      });
      expect(result[0].steps[1]).toEqual({
        action: 'subway',
        from: '신논현역',
        line: '9호선',
        durationMinutes: 3,
      });
    });

    it('triggerReason에 지연 정보가 포함된다', async () => {
      const segment = createDelayedSegment({ delayMinutes: 11, lineInfo: '2호선' });
      const mapping = createMapping();

      mockMappingRepo.findByStationAndLine.mockResolvedValue([mapping]);
      mockSubwayClient.getSubwayArrival.mockResolvedValue([
        new SubwayArrival('st-alt', '1009', '상행', 180, '여의도'),
      ]);

      const result = await service.findAlternatives([segment]);

      expect(result[0].triggerReason).toContain('2호선');
      expect(result[0].triggerReason).toContain('강남역');
      expect(result[0].triggerReason).toContain('11분');
    });

    it('양방향 매핑의 역방향도 매칭된다', async () => {
      // Segment is at 신논현 9호선 (the "to" side of the mapping)
      const segment = createDelayedSegment({
        checkpointId: 'cp-2',
        checkpointName: '신논현역',
        lineInfo: '9호선',
        estimatedWaitMinutes: 15,
        delayMinutes: 12,
      });

      // The mapping is 강남 2호선 -> 신논현 9호선, bidirectional
      // When queried for 신논현 9호선, the repo would return this mapping
      // and getAlternativeFor would return 강남 2호선
      const mapping = createMapping();

      mockMappingRepo.findByStationAndLine.mockResolvedValue([mapping]);
      // Alternative: 강남역 2호선, wait 3min
      mockSubwayClient.getSubwayArrival.mockResolvedValue([
        new SubwayArrival('st-1', '1002', '상행', 180, '서울대입구'),
      ]);

      const result = await service.findAlternatives([segment]);

      expect(result).toHaveLength(1);
      expect(result[0].description).toContain('강남');
      expect(result[0].description).toContain('2호선');
    });

    it('여러 지연 구간에 대해 각각 대안을 검색한다', async () => {
      const seg1 = createDelayedSegment({
        checkpointId: 'cp-1',
        checkpointName: '강남역',
        lineInfo: '2호선',
        delayMinutes: 10,
        estimatedWaitMinutes: 13,
      });
      const seg2 = createDelayedSegment({
        checkpointId: 'cp-2',
        checkpointName: '신도림역',
        lineInfo: '1호선',
        delayMinutes: 8,
        estimatedWaitMinutes: 13,
      });

      const mapping1 = createMapping();
      const mapping2 = new AlternativeMapping('신도림', '1호선', '신도림', '2호선', 3, {
        id: 'map-2',
        isBidirectional: true,
        isActive: true,
      });

      mockMappingRepo.findByStationAndLine
        .mockResolvedValueOnce([mapping1])
        .mockResolvedValueOnce([mapping2]);

      mockSubwayClient.getSubwayArrival
        .mockResolvedValueOnce([new SubwayArrival('a', '1009', '상행', 180, '여의도')])
        .mockResolvedValueOnce([new SubwayArrival('b', '1002', '상행', 120, '홍대입구')]);

      const result = await service.findAlternatives([seg1, seg2]);

      expect(mockMappingRepo.findByStationAndLine).toHaveBeenCalledTimes(2);
      expect(result.length).toBeGreaterThanOrEqual(1);
    });

    it('walkingDistanceMeters가 결과에 포함된다', async () => {
      const segment = createDelayedSegment();
      const mapping = createMapping({ walkingDistanceMeters: 400 });

      mockMappingRepo.findByStationAndLine.mockResolvedValue([mapping]);
      mockSubwayClient.getSubwayArrival.mockResolvedValue([
        new SubwayArrival('st-alt', '1009', '상행', 180, '여의도'),
      ]);

      const result = await service.findAlternatives([segment]);

      expect(result[0].walkingDistanceMeters).toBe(400);
    });
  });
});
