import { NotFoundException } from '@nestjs/common';
import { GetUserUseCase } from './get-user.use-case';
import { IUserRepository } from '@domain/repositories/user.repository';
import { User } from '@domain/entities/user.entity';

describe('GetUserUseCase', () => {
  let useCase: GetUserUseCase;
  let mockUserRepository: jest.Mocked<IUserRepository>;

  const mockUser = new User(
    'test@example.com',
    '테스트유저',
    '01012345678',
    'hashedPassword',
    { address: '서울시 강남구', lat: 37.5665, lng: 126.978 },
    undefined, // googleId
    'user-1',
  );

  beforeEach(() => {
    mockUserRepository = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findByGoogleId: jest.fn(),
      updateGoogleId: jest.fn(),
      save: jest.fn(),
    };

    useCase = new GetUserUseCase(mockUserRepository);
  });

  describe('execute', () => {
    it('존재하는 사용자 ID로 조회 시 사용자 반환', async () => {
      mockUserRepository.findById.mockResolvedValue(mockUser);

      const result = await useCase.execute('user-1');

      expect(result).toBe(mockUser);
      expect(mockUserRepository.findById).toHaveBeenCalledWith('user-1');
    });

    it('존재하지 않는 사용자 ID로 조회 시 NotFoundException 발생', async () => {
      mockUserRepository.findById.mockResolvedValue(undefined);

      await expect(useCase.execute('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
      await expect(useCase.execute('non-existent-id')).rejects.toThrow(
        '사용자를 찾을 수 없습니다.',
      );
    });

    it('빈 문자열 ID로 조회 시에도 repository 호출', async () => {
      mockUserRepository.findById.mockResolvedValue(undefined);

      await expect(useCase.execute('')).rejects.toThrow(NotFoundException);
      expect(mockUserRepository.findById).toHaveBeenCalledWith('');
    });
  });
});
