import { UnauthorizedException } from '@nestjs/common';
import { LoginUseCase } from './login.use-case';
import { IUserRepository } from '@domain/repositories/user.repository';
import { User } from '@domain/entities/user.entity';

// bcrypt 모킹으로 테스트 속도 향상
jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashedPassword'),
  hashSync: jest.fn().mockReturnValue('hashedPassword'),
  compare: jest.fn().mockImplementation((password: string, hash: string) => {
    // password123은 올바른 비밀번호
    return Promise.resolve(password === 'password123' && hash === 'hashedPassword');
  }),
}));

describe('LoginUseCase', () => {
  let useCase: LoginUseCase;
  let mockUserRepository: jest.Mocked<IUserRepository>;

  const hashedPassword = 'hashedPassword';

  const mockUser = new User(
    'test@example.com',
    '테스트유저',
    '01012345678',
    hashedPassword,
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

    useCase = new LoginUseCase(mockUserRepository);
  });

  describe('execute', () => {
    it('올바른 자격 증명으로 로그인 성공', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(mockUser);

      const result = await useCase.execute({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result).toBe(mockUser);
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith('test@example.com');
    });

    it('존재하지 않는 이메일로 로그인 시 UnauthorizedException 발생', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(undefined);

      await expect(
        useCase.execute({
          email: 'notfound@example.com',
          password: 'password123',
        }),
      ).rejects.toThrow(UnauthorizedException);

      await expect(
        useCase.execute({
          email: 'notfound@example.com',
          password: 'password123',
        }),
      ).rejects.toThrow('이메일 또는 비밀번호가 일치하지 않습니다.');
    });

    it('잘못된 비밀번호로 로그인 시 UnauthorizedException 발생', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(mockUser);

      await expect(
        useCase.execute({
          email: 'test@example.com',
          password: 'wrongpassword',
        }),
      ).rejects.toThrow(UnauthorizedException);

      await expect(
        useCase.execute({
          email: 'test@example.com',
          password: 'wrongpassword',
        }),
      ).rejects.toThrow('이메일 또는 비밀번호가 일치하지 않습니다.');
    });

    it('비밀번호가 설정되지 않은 계정으로 로그인 시 UnauthorizedException 발생', async () => {
      const userWithoutPassword = new User(
        'nopassword@example.com',
        '비밀번호없는유저',
        '01012345678',
        undefined, // passwordHash
        { address: '서울시 강남구', lat: 37.5665, lng: 126.978 },
        undefined, // googleId
        'user-2',
      );
      mockUserRepository.findByEmail.mockResolvedValue(userWithoutPassword);

      await expect(
        useCase.execute({
          email: 'nopassword@example.com',
          password: 'anypassword',
        }),
      ).rejects.toThrow(UnauthorizedException);

      await expect(
        useCase.execute({
          email: 'nopassword@example.com',
          password: 'anypassword',
        }),
      ).rejects.toThrow('비밀번호가 설정되지 않은 계정입니다.');
    });

    it('빈 비밀번호 해시로 로그인 시 UnauthorizedException 발생', async () => {
      const userWithEmptyHash = new User(
        'emptyhash@example.com',
        '빈해시유저',
        '01012345678',
        '',
        { address: '서울시 강남구', lat: 37.5665, lng: 126.978 },
        undefined, // googleId
        'user-3',
      );
      mockUserRepository.findByEmail.mockResolvedValue(userWithEmptyHash);

      await expect(
        useCase.execute({
          email: 'emptyhash@example.com',
          password: 'anypassword',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
