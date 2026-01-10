import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/presentation/app.module';
import { DataSource } from 'typeorm';

describe('AppController (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    dataSource = moduleFixture.get<DataSource>(DataSource);
  });

  afterAll(async () => {
    await app.close();
  });

  // Helper: 사용자 등록 및 토큰 획득
  async function registerAndLogin(email: string, password: string, name: string) {
    const registerRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password, name });

    // 이미 존재하면 로그인만
    if (registerRes.status === 409) {
      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email, password });
      return {
        token: loginRes.body.accessToken,
        userId: loginRes.body.user.id,
      };
    }

    return {
      token: registerRes.body.accessToken,
      userId: registerRes.body.user.id,
    };
  }

  describe('Authentication', () => {
    it('should block unauthenticated requests', async () => {
      return request(app.getHttpServer())
        .get('/users/some-id')
        .expect(401);
    });

    it('should allow authenticated requests', async () => {
      const { token, userId } = await registerAndLogin(
        'authtest@example.com',
        'SecurePass123!',
        'Auth Test User',
      );

      return request(app.getHttpServer())
        .get(`/users/${userId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .expect((res: request.Response) => {
          expect(res.body.email).toBe('authtest@example.com');
          expect(res.body.passwordHash).toBeUndefined();
        });
    });
  });

  describe('Authorization', () => {
    it('should block access to other user data', async () => {
      const { token } = await registerAndLogin(
        'user1@example.com',
        'SecurePass123!',
        'User One',
      );

      const { userId: otherUserId } = await registerAndLogin(
        'user2@example.com',
        'SecurePass123!',
        'User Two',
      );

      // 다른 사용자 정보 조회 시도 -> 403 Forbidden
      return request(app.getHttpServer())
        .get(`/users/${otherUserId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });
  });

  describe('User API', () => {
    it('/auth/register (POST) should create a user', async () => {
      const uniqueEmail = `test-${Date.now()}@example.com`;

      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: uniqueEmail,
          password: 'SecurePass123!',
          name: 'Test User',
        })
        .expect(201)
        .expect((res: request.Response) => {
          expect(res.body.accessToken).toBeDefined();
          expect(res.body.user.email).toBe(uniqueEmail);
          expect(res.body.user.passwordHash).toBeUndefined();
        });
    });

    it('/users/:id (GET) should return user without passwordHash', async () => {
      const { token, userId } = await registerAndLogin(
        `getuser-${Date.now()}@example.com`,
        'SecurePass123!',
        'Get User Test',
      );

      return request(app.getHttpServer())
        .get(`/users/${userId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .expect((res: request.Response) => {
          expect(res.body.id).toBe(userId);
          expect(res.body.passwordHash).toBeUndefined();
        });
    });
  });

  describe('Alert API', () => {
    it('/alerts (POST) should create an alert', async () => {
      const { token, userId } = await registerAndLogin(
        `alertcreate-${Date.now()}@example.com`,
        'SecurePass123!',
        'Alert Create User',
      );

      return request(app.getHttpServer())
        .post('/alerts')
        .set('Authorization', `Bearer ${token}`)
        .send({
          userId,
          name: '출근 알림',
          schedule: '0 8 * * *',
          alertTypes: ['weather'],
        })
        .expect(201)
        .expect((res: request.Response) => {
          expect(res.body.name).toBe('출근 알림');
          expect(res.body.schedule).toBe('0 8 * * *');
        });
    });

    it('/alerts/user/:userId (GET) should return user alerts', async () => {
      const { token, userId } = await registerAndLogin(
        `alertlist-${Date.now()}@example.com`,
        'SecurePass123!',
        'Alert List User',
      );

      // 알림 먼저 생성
      await request(app.getHttpServer())
        .post('/alerts')
        .set('Authorization', `Bearer ${token}`)
        .send({
          userId,
          name: '테스트 알림',
          schedule: '0 9 * * *',
          alertTypes: ['weather'],
        });

      return request(app.getHttpServer())
        .get(`/alerts/user/${userId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .expect((res: request.Response) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeGreaterThan(0);
        });
    });

    it('should block creating alert for other user', async () => {
      const { token } = await registerAndLogin(
        `alertowner1-${Date.now()}@example.com`,
        'SecurePass123!',
        'Alert Owner One',
      );

      const { userId: otherUserId } = await registerAndLogin(
        `alertowner2-${Date.now()}@example.com`,
        'SecurePass123!',
        'Alert Owner Two',
      );

      // 다른 사용자 ID로 알림 생성 시도 -> 403
      return request(app.getHttpServer())
        .post('/alerts')
        .set('Authorization', `Bearer ${token}`)
        .send({
          userId: otherUserId,
          name: '해킹 시도',
          schedule: '0 8 * * *',
          alertTypes: ['weather'],
        })
        .expect(403);
    });
  });

  describe('Rate Limiting', () => {
    it('should block excessive login attempts', async () => {
      const email = `ratelimit-${Date.now()}@example.com`;

      // 5번 초과 로그인 시도
      for (let i = 0; i < 6; i++) {
        await request(app.getHttpServer())
          .post('/auth/login')
          .send({ email, password: 'wrongpassword' });
      }

      // 6번째 요청은 429 Too Many Requests
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({ email, password: 'wrongpassword' })
        .expect(429);
    });
  });
});
