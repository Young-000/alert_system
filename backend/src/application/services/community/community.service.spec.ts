import { CommunityService } from './community.service';

describe('CommunityService', () => {
  let service: CommunityService;
  let mockCheckpointRepo: {
    find: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let mockRouteRepo: {
    findOne: jest.Mock;
  };
  let mockSessionRepo: {
    createQueryBuilder: jest.Mock;
  };

  beforeEach(() => {
    mockCheckpointRepo = {
      find: jest.fn(),
      createQueryBuilder: jest.fn(),
    };
    mockRouteRepo = {
      findOne: jest.fn(),
    };
    mockSessionRepo = {
      createQueryBuilder: jest.fn(),
    };

    service = new CommunityService(
      mockCheckpointRepo as never,
      mockRouteRepo as never,
      mockSessionRepo as never,
    );
  });

  describe('getNeighborStats', () => {
    it('경로가 없으면 no_route를 반환한다', async () => {
      mockRouteRepo.findOne.mockResolvedValue(null);

      const result = await service.getNeighborStats('user-1');

      expect(result.dataStatus).toBe('no_route');
      expect(result.routeId).toBeNull();
      expect(result.neighborCount).toBe(0);
    });

    it('지정된 routeId로 경로를 찾는다', async () => {
      mockRouteRepo.findOne.mockResolvedValue({ id: 'route-1', userId: 'user-1' });
      mockCheckpointRepo.find.mockResolvedValue([]);

      await service.getNeighborStats('user-1', 'route-1');

      expect(mockRouteRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'route-1', userId: 'user-1' },
      });
    });

    it('routeId 미지정 시 preferred 경로를 먼저 찾는다', async () => {
      mockRouteRepo.findOne
        .mockResolvedValueOnce({ id: 'preferred-route', userId: 'user-1' });
      mockCheckpointRepo.find.mockResolvedValue([]);

      await service.getNeighborStats('user-1');

      expect(mockRouteRepo.findOne).toHaveBeenCalledWith({
        where: { userId: 'user-1', isPreferred: true },
      });
    });

    it('checkpoint key가 2개 미만이면 insufficient를 반환한다', async () => {
      mockRouteRepo.findOne.mockResolvedValue({ id: 'route-1' });
      mockCheckpointRepo.find.mockResolvedValue([
        { checkpointKey: 'station:1' },
      ]);

      const result = await service.getNeighborStats('user-1', 'route-1');

      expect(result.dataStatus).toBe('insufficient');
    });

    it('null checkpoint key는 제외한다', async () => {
      mockRouteRepo.findOne.mockResolvedValue({ id: 'route-1' });
      mockCheckpointRepo.find.mockResolvedValue([
        { checkpointKey: 'station:1' },
        { checkpointKey: null },
      ]);

      const result = await service.getNeighborStats('user-1', 'route-1');

      expect(result.dataStatus).toBe('insufficient');
    });

    it('이웃이 3명 미만이면 insufficient를 반환한다', async () => {
      mockRouteRepo.findOne.mockResolvedValue({ id: 'route-1' });
      mockCheckpointRepo.find.mockResolvedValue([
        { checkpointKey: 'station:1' },
        { checkpointKey: 'station:2' },
      ]);

      const mockQb = createMockQueryBuilder([
        { userId: 'n1', sharedCount: '2' },
        { userId: 'n2', sharedCount: '2' },
      ]);
      mockCheckpointRepo.createQueryBuilder.mockReturnValue(mockQb);

      const result = await service.getNeighborStats('user-1', 'route-1');

      expect(result.dataStatus).toBe('insufficient');
      expect(result.neighborCount).toBe(2);
    });

    it('이웃이 충분하면 sufficient와 통계를 반환한다', async () => {
      mockRouteRepo.findOne.mockResolvedValue({ id: 'route-1' });
      mockCheckpointRepo.find.mockResolvedValue([
        { checkpointKey: 'station:1' },
        { checkpointKey: 'station:2' },
      ]);

      // neighbor detection query
      const neighbors = [
        { userId: 'n1', sharedCount: '2' },
        { userId: 'n2', sharedCount: '3' },
        { userId: 'n3', sharedCount: '2' },
      ];
      const neighborQb = createMockQueryBuilder(neighbors);
      mockCheckpointRepo.createQueryBuilder.mockReturnValue(neighborQb);

      // neighbor avg query
      const neighborAvgQb = createMockRawOneQueryBuilder({ avgDuration: '42.5' });
      // my avg query
      const myAvgQb = createMockRawOneQueryBuilder({ avgDuration: '38.0' });

      mockSessionRepo.createQueryBuilder
        .mockReturnValueOnce(neighborAvgQb)
        .mockReturnValueOnce(myAvgQb);

      const result = await service.getNeighborStats('user-1', 'route-1');

      expect(result.dataStatus).toBe('sufficient');
      expect(result.neighborCount).toBe(3);
      expect(result.avgDurationMinutes).toBe(43); // rounded
      expect(result.myAvgDurationMinutes).toBe(38); // rounded
      expect(result.diffMinutes).toBe(-5); // 38 - 43
    });

    it('이웃의 세션 데이터가 없으면 avgDurationMinutes가 null이다', async () => {
      mockRouteRepo.findOne.mockResolvedValue({ id: 'route-1' });
      mockCheckpointRepo.find.mockResolvedValue([
        { checkpointKey: 'station:1' },
        { checkpointKey: 'station:2' },
      ]);

      const neighbors = [
        { userId: 'n1', sharedCount: '2' },
        { userId: 'n2', sharedCount: '2' },
        { userId: 'n3', sharedCount: '2' },
      ];
      const neighborQb = createMockQueryBuilder(neighbors);
      mockCheckpointRepo.createQueryBuilder.mockReturnValue(neighborQb);

      const neighborAvgQb = createMockRawOneQueryBuilder({ avgDuration: null });
      const myAvgQb = createMockRawOneQueryBuilder({ avgDuration: '38.0' });
      mockSessionRepo.createQueryBuilder
        .mockReturnValueOnce(neighborAvgQb)
        .mockReturnValueOnce(myAvgQb);

      const result = await service.getNeighborStats('user-1', 'route-1');

      expect(result.dataStatus).toBe('sufficient');
      expect(result.avgDurationMinutes).toBeNull();
      expect(result.diffMinutes).toBeNull();
    });

    it('사용자 자신의 세션 데이터가 없으면 myAvg가 null이다', async () => {
      mockRouteRepo.findOne.mockResolvedValue({ id: 'route-1' });
      mockCheckpointRepo.find.mockResolvedValue([
        { checkpointKey: 'station:1' },
        { checkpointKey: 'station:2' },
      ]);

      const neighbors = [
        { userId: 'n1', sharedCount: '2' },
        { userId: 'n2', sharedCount: '2' },
        { userId: 'n3', sharedCount: '2' },
      ];
      const neighborQb = createMockQueryBuilder(neighbors);
      mockCheckpointRepo.createQueryBuilder.mockReturnValue(neighborQb);

      const neighborAvgQb = createMockRawOneQueryBuilder({ avgDuration: '42.5' });
      const myAvgQb = createMockRawOneQueryBuilder({ avgDuration: null });
      mockSessionRepo.createQueryBuilder
        .mockReturnValueOnce(neighborAvgQb)
        .mockReturnValueOnce(myAvgQb);

      const result = await service.getNeighborStats('user-1', 'route-1');

      expect(result.myAvgDurationMinutes).toBeNull();
      expect(result.diffMinutes).toBeNull();
    });
  });
});

// Helper: mock QueryBuilder for getRawMany (neighbor detection)
function createMockQueryBuilder(rawResults: unknown[]): Record<string, jest.Mock> {
  const qb: Record<string, jest.Mock> = {};
  const methods = [
    'innerJoin', 'select', 'addSelect', 'where', 'andWhere',
    'groupBy', 'having',
  ];
  for (const m of methods) {
    qb[m] = jest.fn().mockReturnValue(qb);
  }
  qb['getRawMany'] = jest.fn().mockResolvedValue(rawResults);
  return qb;
}

// Helper: mock QueryBuilder for getRawOne
function createMockRawOneQueryBuilder(rawResult: unknown): Record<string, jest.Mock> {
  const qb: Record<string, jest.Mock> = {};
  const methods = ['select', 'where', 'andWhere'];
  for (const m of methods) {
    qb[m] = jest.fn().mockReturnValue(qb);
  }
  qb['getRawOne'] = jest.fn().mockResolvedValue(rawResult);
  return qb;
}
