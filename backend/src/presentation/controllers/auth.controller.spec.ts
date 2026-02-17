import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { CreateUserUseCase } from '@application/use-cases/create-user.use-case';
import { LoginUseCase } from '@application/use-cases/login.use-case';
import { AuthService, AuthResponse } from '@infrastructure/auth/auth.service';
import { User } from '@domain/entities/user.entity';

describe('AuthController', () => {
  let controller: AuthController;
  let createUserUseCase: jest.Mocked<CreateUserUseCase>;
  let loginUseCase: jest.Mocked<LoginUseCase>;
  let authService: jest.Mocked<AuthService>;
  let configService: jest.Mocked<ConfigService>;

  const mockUser = new User(
    'test@test.com',
    '테스트유저',
    '01012345678',
    'hashed-pw',
    undefined,
    undefined,
    'user-123',
  );

  const mockAuthResponse: AuthResponse = {
    user: {
      id: 'user-123',
      email: 'test@test.com',
      name: '테스트유저',
      phoneNumber: '01012345678',
    },
    accessToken: 'jwt-token-123',
  };

  beforeEach(async () => {
    createUserUseCase = { execute: jest.fn() } as any;
    loginUseCase = { execute: jest.fn() } as any;
    authService = { generateToken: jest.fn() } as any;
    configService = {
      get: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: CreateUserUseCase, useValue: createUserUseCase },
        { provide: LoginUseCase, useValue: loginUseCase },
        { provide: AuthService, useValue: authService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  describe('register', () => {
    const registerDto = {
      email: 'test@test.com',
      password: 'password123',
      name: '테스트유저',
      phoneNumber: '01012345678',
    };

    it('회원가입 성공 시 AuthResponse 반환', async () => {
      createUserUseCase.execute.mockResolvedValue(mockUser);
      authService.generateToken.mockReturnValue(mockAuthResponse);

      const result = await controller.register(registerDto);

      expect(createUserUseCase.execute).toHaveBeenCalledWith(registerDto);
      expect(authService.generateToken).toHaveBeenCalledWith(mockUser);
      expect(result).toEqual(mockAuthResponse);
      expect(result.accessToken).toBeDefined();
      expect(result.user.email).toBe('test@test.com');
    });

    it('createUserUseCase에서 에러 발생 시 전파', async () => {
      createUserUseCase.execute.mockRejectedValue(new Error('이미 존재하는 이메일입니다.'));

      await expect(controller.register(registerDto)).rejects.toThrow('이미 존재하는 이메일입니다.');
    });
  });

  describe('login', () => {
    const loginDto = {
      email: 'test@test.com',
      password: 'password123',
    };

    it('로그인 성공 시 AuthResponse 반환', async () => {
      loginUseCase.execute.mockResolvedValue(mockUser);
      authService.generateToken.mockReturnValue(mockAuthResponse);

      const result = await controller.login(loginDto);

      expect(loginUseCase.execute).toHaveBeenCalledWith(loginDto);
      expect(authService.generateToken).toHaveBeenCalledWith(mockUser);
      expect(result).toEqual(mockAuthResponse);
    });

    it('잘못된 자격 증명 시 에러 전파', async () => {
      loginUseCase.execute.mockRejectedValue(new Error('이메일 또는 비밀번호가 올바르지 않습니다.'));

      await expect(controller.login(loginDto)).rejects.toThrow(
        '이메일 또는 비밀번호가 올바르지 않습니다.',
      );
    });
  });

  describe('googleLogin', () => {
    it('Google OAuth 리다이렉트 (Guard가 처리)', async () => {
      // AuthGuard('google')가 리다이렉트 처리하므로 메서드 자체는 undefined 반환
      const result = await controller.googleLogin();
      expect(result).toBeUndefined();
    });
  });

  describe('googleCallback', () => {
    it('googleOAuthUseCase가 없으면 에러 리다이렉트', async () => {
      const mockRes = {
        redirect: jest.fn(),
      } as any;
      const mockReq = {
        user: { googleId: 'g-123', email: 'google@test.com', name: 'Google User' },
      } as any;

      await controller.googleCallback(mockReq, mockRes);

      expect(mockRes.redirect).toHaveBeenCalledWith(
        expect.stringContaining('error=google_not_configured'),
      );
    });
  });

  describe('googleStatus', () => {
    it('Google OAuth 비활성화 상태 반환 (설정 없음)', () => {
      // configService.get이 undefined를 반환하는 기본 상태
      const result = controller.googleStatus();

      expect(result.enabled).toBe(false);
      expect(result.message).toContain('not configured');
    });

    it('Google OAuth 활성화 상태 반환 (설정 있음)', async () => {
      // Google 설정이 있는 경우 새로운 controller 생성
      const enabledConfigService = {
        get: jest.fn().mockImplementation((key: string) => {
          if (key === 'GOOGLE_CLIENT_ID') return 'client-id';
          if (key === 'GOOGLE_CLIENT_SECRET') return 'client-secret';
          if (key === 'FRONTEND_URL') return 'http://localhost:5173';
          return undefined;
        }),
      } as any;

      const module = await Test.createTestingModule({
        controllers: [AuthController],
        providers: [
          { provide: CreateUserUseCase, useValue: createUserUseCase },
          { provide: LoginUseCase, useValue: loginUseCase },
          { provide: AuthService, useValue: authService },
          { provide: ConfigService, useValue: enabledConfigService },
        ],
      }).compile();

      const enabledController = module.get<AuthController>(AuthController);
      const result = enabledController.googleStatus();

      expect(result.enabled).toBe(true);
      expect(result.message).toContain('configured');
    });
  });

  describe('googleCallback with GoogleOAuthUseCase', () => {
    it('Google OAuth 성공 시 프론트엔드로 토큰과 함께 리다이렉트', async () => {
      const googleOAuthUseCase = { execute: jest.fn() };
      googleOAuthUseCase.execute.mockResolvedValue(mockUser);

      const enabledConfigService = {
        get: jest.fn().mockImplementation((key: string) => {
          if (key === 'GOOGLE_CLIENT_ID') return 'client-id';
          if (key === 'GOOGLE_CLIENT_SECRET') return 'client-secret';
          if (key === 'FRONTEND_URL') return 'http://localhost:5173';
          return undefined;
        }),
      } as any;

      authService.generateToken.mockReturnValue(mockAuthResponse);

      const module = await Test.createTestingModule({
        controllers: [AuthController],
        providers: [
          { provide: CreateUserUseCase, useValue: createUserUseCase },
          { provide: LoginUseCase, useValue: loginUseCase },
          { provide: AuthService, useValue: authService },
          { provide: ConfigService, useValue: enabledConfigService },
          { provide: 'GoogleOAuthUseCase', useValue: googleOAuthUseCase },
        ],
      }).compile();

      const ctrl = module.get<AuthController>(AuthController);
      const mockReq = {
        user: { googleId: 'g-123', email: 'google@test.com', name: 'Google User' },
      } as any;
      const mockRes = { redirect: jest.fn() } as any;

      await ctrl.googleCallback(mockReq, mockRes);

      expect(googleOAuthUseCase.execute).toHaveBeenCalledWith(mockReq.user);
      expect(authService.generateToken).toHaveBeenCalledWith(mockUser);
      expect(mockRes.redirect).toHaveBeenCalledWith(
        expect.stringContaining('/auth/callback#'),
      );
    });

    it('Google OAuth 콜백 에러 시 에러 리다이렉트', async () => {
      const googleOAuthUseCase = { execute: jest.fn() };
      googleOAuthUseCase.execute.mockRejectedValue(new Error('OAuth failed'));

      const enabledConfigService = {
        get: jest.fn().mockImplementation((key: string) => {
          if (key === 'GOOGLE_CLIENT_ID') return 'client-id';
          if (key === 'GOOGLE_CLIENT_SECRET') return 'client-secret';
          if (key === 'FRONTEND_URL') return 'http://localhost:5173';
          return undefined;
        }),
      } as any;

      const module = await Test.createTestingModule({
        controllers: [AuthController],
        providers: [
          { provide: CreateUserUseCase, useValue: createUserUseCase },
          { provide: LoginUseCase, useValue: loginUseCase },
          { provide: AuthService, useValue: authService },
          { provide: ConfigService, useValue: enabledConfigService },
          { provide: 'GoogleOAuthUseCase', useValue: googleOAuthUseCase },
        ],
      }).compile();

      const ctrl = module.get<AuthController>(AuthController);
      const mockReq = { user: { googleId: 'g-123' } } as any;
      const mockRes = { redirect: jest.fn() } as any;

      await ctrl.googleCallback(mockReq, mockRes);

      expect(mockRes.redirect).toHaveBeenCalledWith(
        expect.stringContaining('error=google_auth_failed'),
      );
    });
  });
});
