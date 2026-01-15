import { GetAirQualityUseCase } from './get-air-quality.use-case';
import { IAirQualityApiClient } from '@infrastructure/external-apis/air-quality-api.client';
import { IUserRepository } from '@domain/repositories/user.repository';
import { User } from '@domain/entities/user.entity';
import { AirQuality } from '@domain/entities/air-quality.entity';

describe('GetAirQualityUseCase', () => {
  let useCase: GetAirQualityUseCase;
  let mockAirQualityApiClient: jest.Mocked<IAirQualityApiClient>;
  let mockUserRepository: jest.Mocked<IUserRepository>;

  const mockAirQuality = new AirQuality(
    '강남구',
    45,
    22,
    65,
    '보통',
  );

  const mockUser = new User(
    'test@example.com',
    '테스트유저',
    'hashedPassword',
    { address: '서울시 강남구', lat: 37.5665, lng: 126.978 },
    'user-1',
  );

  beforeEach(() => {
    mockAirQualityApiClient = {
      getAirQuality: jest.fn(),
    };

    mockUserRepository = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      save: jest.fn(),
    };

    useCase = new GetAirQualityUseCase(
      mockAirQualityApiClient,
      mockUserRepository,
    );
  });

  describe('execute', () => {
    it('사용자 위치 기반으로 미세먼지 정보 조회', async () => {
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockAirQualityApiClient.getAirQuality.mockResolvedValue(mockAirQuality);

      const result = await useCase.execute('user-1');

      expect(result).toEqual(mockAirQuality);
      expect(mockUserRepository.findById).toHaveBeenCalledWith('user-1');
      expect(mockAirQualityApiClient.getAirQuality).toHaveBeenCalledWith(
        37.5665,
        126.978,
      );
    });

    it('존재하지 않는 사용자 ID로 조회 시 에러 발생', async () => {
      mockUserRepository.findById.mockResolvedValue(undefined);

      await expect(useCase.execute('non-existent')).rejects.toThrow(
        'User location not found',
      );
    });

    it('사용자 위치 정보가 없는 경우 에러 발생', async () => {
      const userWithoutLocation = new User(
        'nolocation@example.com',
        '위치없는유저',
        'hashedPassword',
        undefined,
        'user-2',
      );
      mockUserRepository.findById.mockResolvedValue(userWithoutLocation);

      await expect(useCase.execute('user-2')).rejects.toThrow(
        'User location not found',
      );
    });
  });

  describe('executeByLocation', () => {
    it('좌표로 직접 미세먼지 정보 조회', async () => {
      mockAirQualityApiClient.getAirQuality.mockResolvedValue(mockAirQuality);

      const result = await useCase.executeByLocation(37.5665, 126.978);

      expect(result).toEqual(mockAirQuality);
      expect(mockAirQualityApiClient.getAirQuality).toHaveBeenCalledWith(
        37.5665,
        126.978,
      );
    });

    it('API 클라이언트 에러 전파', async () => {
      mockAirQualityApiClient.getAirQuality.mockRejectedValue(
        new Error('API Error'),
      );

      await expect(useCase.executeByLocation(37.5665, 126.978)).rejects.toThrow(
        'API Error',
      );
    });
  });
});
