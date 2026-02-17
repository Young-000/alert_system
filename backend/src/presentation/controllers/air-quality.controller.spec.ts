import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { AirQualityController } from './air-quality.controller';
import { GetAirQualityUseCase } from '@application/use-cases/get-air-quality.use-case';

describe('AirQualityController', () => {
  let controller: AirQualityController;
  let getAirQualityUseCase: jest.Mocked<GetAirQualityUseCase>;

  const OWNER_ID = 'user-123';
  const OTHER_USER_ID = 'other-user';

  const mockRequest = (userId: string) => ({
    user: { userId, email: `${userId}@test.com` },
  }) as any;

  const mockAirQuality = {
    pm10: 45,
    pm25: 20,
    grade: '보통',
    station: '종로구',
  };

  beforeEach(async () => {
    getAirQualityUseCase = {
      execute: jest.fn(),
      executeByLocation: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AirQualityController],
      providers: [
        { provide: GetAirQualityUseCase, useValue: getAirQualityUseCase },
      ],
    }).compile();

    controller = module.get<AirQualityController>(AirQualityController);
  });

  describe('getByUser', () => {
    it('자신의 위치 기반 대기질 조회 성공', async () => {
      getAirQualityUseCase.execute.mockResolvedValue(mockAirQuality as any);

      const result = await controller.getByUser(OWNER_ID, mockRequest(OWNER_ID));

      expect(getAirQualityUseCase.execute).toHaveBeenCalledWith(OWNER_ID);
      expect(result).toEqual(mockAirQuality);
    });

    it('다른 사용자의 대기질 조회 시 ForbiddenException', async () => {
      await expect(
        controller.getByUser(OWNER_ID, mockRequest(OTHER_USER_ID)),
      ).rejects.toThrow(ForbiddenException);

      expect(getAirQualityUseCase.execute).not.toHaveBeenCalled();
    });

    it('다른 사용자 접근 시 올바른 에러 메시지', async () => {
      await expect(
        controller.getByUser(OWNER_ID, mockRequest(OTHER_USER_ID)),
      ).rejects.toThrow('다른 사용자의 정보를 조회할 수 없습니다.');
    });
  });

  describe('getByLocation', () => {
    it('좌표 기반 대기질 조회 성공', async () => {
      getAirQualityUseCase.executeByLocation.mockResolvedValue(mockAirQuality as any);

      const query = { lat: 37.5665, lng: 126.978 };
      const result = await controller.getByLocation(query as any);

      expect(getAirQualityUseCase.executeByLocation).toHaveBeenCalledWith(37.5665, 126.978);
      expect(result).toEqual(mockAirQuality);
    });

    it('API 에러 시 전파', async () => {
      getAirQualityUseCase.executeByLocation.mockRejectedValue(new Error('API Error'));

      await expect(
        controller.getByLocation({ lat: 37.5665, lng: 126.978 } as any),
      ).rejects.toThrow('API Error');
    });
  });
});
