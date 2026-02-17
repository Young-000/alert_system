import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { RouteController } from './route.controller';
import { ManageRouteUseCase } from '@application/use-cases/manage-route.use-case';
import { RecommendBestRouteUseCase } from '@application/use-cases/recommend-best-route.use-case';

describe('RouteController', () => {
  let controller: RouteController;
  let manageRouteUseCase: jest.Mocked<ManageRouteUseCase>;
  let recommendBestRouteUseCase: jest.Mocked<RecommendBestRouteUseCase>;

  const OWNER_ID = 'user-123';
  const OTHER_USER_ID = 'other-user';

  const mockRoute = {
    id: 'route-1',
    userId: OWNER_ID,
    name: '출근 경로 A',
    routeType: 'commute',
    checkpoints: [],
  };

  const mockRouteOther = {
    id: 'route-2',
    userId: OTHER_USER_ID,
    name: '출근 경로 B',
    routeType: 'commute',
    checkpoints: [],
  };

  const mockRequest = (userId: string) => ({
    user: { userId, email: `${userId}@test.com` },
  }) as any;

  beforeEach(async () => {
    manageRouteUseCase = {
      createRoute: jest.fn(),
      getRouteById: jest.fn(),
      getRoutesByUserId: jest.fn(),
      getRoutesByUserIdAndType: jest.fn(),
      updateRoute: jest.fn(),
      deleteRoute: jest.fn(),
    } as any;

    recommendBestRouteUseCase = {
      execute: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [RouteController],
      providers: [
        { provide: ManageRouteUseCase, useValue: manageRouteUseCase },
        { provide: RecommendBestRouteUseCase, useValue: recommendBestRouteUseCase },
      ],
    }).compile();

    controller = module.get<RouteController>(RouteController);
  });

  describe('createRoute', () => {
    const createDto = {
      userId: OWNER_ID,
      name: '출근 경로 A',
      routeType: 'commute',
      checkpoints: [],
    };

    it('자신의 경로 생성 성공', async () => {
      manageRouteUseCase.createRoute.mockResolvedValue(mockRoute as any);

      const result = await controller.createRoute(createDto as any, mockRequest(OWNER_ID));

      expect(manageRouteUseCase.createRoute).toHaveBeenCalledWith(createDto);
      expect(result).toEqual(mockRoute);
    });

    it('다른 사용자의 경로 생성 시 ForbiddenException', async () => {
      await expect(
        controller.createRoute(createDto as any, mockRequest(OTHER_USER_ID)),
      ).rejects.toThrow(ForbiddenException);

      expect(manageRouteUseCase.createRoute).not.toHaveBeenCalled();
    });

    it('다른 사용자의 경로 생성 시 올바른 에러 메시지', async () => {
      await expect(
        controller.createRoute(createDto as any, mockRequest(OTHER_USER_ID)),
      ).rejects.toThrow('다른 사용자의 경로를 생성할 수 없습니다.');
    });
  });

  describe('getUserRoutes', () => {
    it('자신의 경로 목록 조회 성공', async () => {
      manageRouteUseCase.getRoutesByUserId.mockResolvedValue([mockRoute] as any);

      const result = await controller.getUserRoutes(OWNER_ID, undefined, mockRequest(OWNER_ID));

      expect(manageRouteUseCase.getRoutesByUserId).toHaveBeenCalledWith(OWNER_ID);
      expect(result).toEqual([mockRoute]);
    });

    it('routeType 필터 적용 시 getRoutesByUserIdAndType 호출', async () => {
      manageRouteUseCase.getRoutesByUserIdAndType.mockResolvedValue([mockRoute] as any);

      const result = await controller.getUserRoutes(OWNER_ID, 'commute', mockRequest(OWNER_ID));

      expect(manageRouteUseCase.getRoutesByUserIdAndType).toHaveBeenCalledWith(OWNER_ID, 'commute');
      expect(result).toEqual([mockRoute]);
    });

    it('다른 사용자의 경로 목록 조회 시 ForbiddenException', async () => {
      await expect(
        controller.getUserRoutes(OWNER_ID, undefined, mockRequest(OTHER_USER_ID)),
      ).rejects.toThrow(ForbiddenException);

      expect(manageRouteUseCase.getRoutesByUserId).not.toHaveBeenCalled();
    });

    it('경로가 없을 때 빈 배열 반환', async () => {
      manageRouteUseCase.getRoutesByUserId.mockResolvedValue([]);

      const result = await controller.getUserRoutes(OWNER_ID, undefined, mockRequest(OWNER_ID));

      expect(result).toEqual([]);
    });
  });

  describe('getRouteRecommendation', () => {
    const mockRecommendation = {
      recommendedRouteId: 'route-1',
      routeName: '출근 경로 A',
      score: 85,
      reason: '가장 빠르고 안정적인 경로',
    };

    it('자신의 경로 추천 조회 성공', async () => {
      recommendBestRouteUseCase.execute.mockResolvedValue(mockRecommendation as any);

      const result = await controller.getRouteRecommendation(
        OWNER_ID,
        { weather: '맑음' } as any,
        mockRequest(OWNER_ID),
      );

      expect(recommendBestRouteUseCase.execute).toHaveBeenCalledWith(OWNER_ID, '맑음');
      expect(result).toEqual(mockRecommendation);
    });

    it('다른 사용자의 경로 추천 조회 시 ForbiddenException', async () => {
      await expect(
        controller.getRouteRecommendation(
          OWNER_ID,
          { weather: '맑음' } as any,
          mockRequest(OTHER_USER_ID),
        ),
      ).rejects.toThrow(ForbiddenException);

      expect(recommendBestRouteUseCase.execute).not.toHaveBeenCalled();
    });
  });

  describe('getRoute', () => {
    it('자신의 경로 단건 조회 성공', async () => {
      manageRouteUseCase.getRouteById.mockResolvedValue(mockRoute as any);

      const result = await controller.getRoute('route-1', mockRequest(OWNER_ID));

      expect(manageRouteUseCase.getRouteById).toHaveBeenCalledWith('route-1');
      expect(result).toEqual(mockRoute);
    });

    it('다른 사용자의 경로 조회 시 ForbiddenException', async () => {
      manageRouteUseCase.getRouteById.mockResolvedValue(mockRouteOther as any);

      await expect(
        controller.getRoute('route-2', mockRequest(OWNER_ID)),
      ).rejects.toThrow(ForbiddenException);
    });

    it('존재하지 않는 경로 조회 시 에러 전파', async () => {
      manageRouteUseCase.getRouteById.mockRejectedValue(new Error('Route not found'));

      await expect(
        controller.getRoute('non-existent', mockRequest(OWNER_ID)),
      ).rejects.toThrow('Route not found');
    });
  });

  describe('updateRoute', () => {
    const updateDto = { name: '수정된 경로' };

    it('자신의 경로 수정 성공', async () => {
      const updatedRoute = { ...mockRoute, name: '수정된 경로' };
      manageRouteUseCase.getRouteById.mockResolvedValue(mockRoute as any);
      manageRouteUseCase.updateRoute.mockResolvedValue(updatedRoute as any);

      const result = await controller.updateRoute('route-1', updateDto as any, mockRequest(OWNER_ID));

      expect(manageRouteUseCase.getRouteById).toHaveBeenCalledWith('route-1');
      expect(manageRouteUseCase.updateRoute).toHaveBeenCalledWith('route-1', updateDto);
      expect(result.name).toBe('수정된 경로');
    });

    it('다른 사용자의 경로 수정 시 ForbiddenException', async () => {
      manageRouteUseCase.getRouteById.mockResolvedValue(mockRouteOther as any);

      await expect(
        controller.updateRoute('route-2', updateDto as any, mockRequest(OWNER_ID)),
      ).rejects.toThrow(ForbiddenException);

      expect(manageRouteUseCase.updateRoute).not.toHaveBeenCalled();
    });
  });

  describe('deleteRoute', () => {
    it('자신의 경로 삭제 성공', async () => {
      manageRouteUseCase.getRouteById.mockResolvedValue(mockRoute as any);
      manageRouteUseCase.deleteRoute.mockResolvedValue(undefined);

      await controller.deleteRoute('route-1', mockRequest(OWNER_ID));

      expect(manageRouteUseCase.getRouteById).toHaveBeenCalledWith('route-1');
      expect(manageRouteUseCase.deleteRoute).toHaveBeenCalledWith('route-1');
    });

    it('다른 사용자의 경로 삭제 시 ForbiddenException', async () => {
      manageRouteUseCase.getRouteById.mockResolvedValue(mockRouteOther as any);

      await expect(
        controller.deleteRoute('route-2', mockRequest(OWNER_ID)),
      ).rejects.toThrow(ForbiddenException);

      expect(manageRouteUseCase.deleteRoute).not.toHaveBeenCalled();
    });

    it('다른 사용자의 경로 삭제 시 올바른 에러 메시지', async () => {
      manageRouteUseCase.getRouteById.mockResolvedValue(mockRouteOther as any);

      await expect(
        controller.deleteRoute('route-2', mockRequest(OWNER_ID)),
      ).rejects.toThrow('다른 사용자의 경로를 삭제할 수 없습니다.');
    });
  });
});
