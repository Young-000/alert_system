import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { AuthService, JwtPayload } from './auth.service';
import { User } from '@domain/entities/user.entity';

describe('AuthService', () => {
  let authService: AuthService;
  let mockJwtService: jest.Mocked<JwtService>;

  const mockUser = new User(
    'test@example.com',
    '테스트유저',
    'hashedPassword',
    { address: '서울시 강남구', lat: 37.5665, lng: 126.978 },
    'user-123',
  );

  beforeEach(async () => {
    mockJwtService = {
      sign: jest.fn(),
      verify: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
  });

  describe('generateToken', () => {
    it('사용자 정보로 JWT 토큰 생성', () => {
      const mockToken = 'mock-jwt-token';
      mockJwtService.sign.mockReturnValue(mockToken);

      const result = authService.generateToken(mockUser);

      expect(mockJwtService.sign).toHaveBeenCalledWith({
        sub: 'user-123',
        email: 'test@example.com',
      });
      expect(result).toEqual({
        user: {
          id: 'user-123',
          email: 'test@example.com',
          name: '테스트유저',
        },
        accessToken: mockToken,
      });
    });

    it('다른 사용자 정보로 토큰 생성', () => {
      const anotherUser = new User(
        'another@example.com',
        '다른유저',
        'password',
        undefined,
        'user-456',
      );
      const mockToken = 'another-jwt-token';
      mockJwtService.sign.mockReturnValue(mockToken);

      const result = authService.generateToken(anotherUser);

      expect(mockJwtService.sign).toHaveBeenCalledWith({
        sub: 'user-456',
        email: 'another@example.com',
      });
      expect(result.user.name).toBe('다른유저');
      expect(result.accessToken).toBe(mockToken);
    });
  });

  describe('verifyToken', () => {
    it('유효한 토큰 검증 성공', () => {
      const mockPayload: JwtPayload = {
        sub: 'user-123',
        email: 'test@example.com',
      };
      mockJwtService.verify.mockReturnValue(mockPayload);

      const result = authService.verifyToken('valid-token');

      expect(mockJwtService.verify).toHaveBeenCalledWith('valid-token');
      expect(result).toEqual(mockPayload);
    });

    it('만료된 토큰 검증 시 에러 발생', () => {
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('jwt expired');
      });

      expect(() => authService.verifyToken('expired-token')).toThrow('jwt expired');
    });

    it('잘못된 형식의 토큰 검증 시 에러 발생', () => {
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('jwt malformed');
      });

      expect(() => authService.verifyToken('invalid-token')).toThrow('jwt malformed');
    });
  });
});
