import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { TestAppModule } from './test-app.module';
import { DataSource } from 'typeorm';

describe('AppController (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [TestAppModule],
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

      if (!loginRes.body.user) {
        throw new Error(`Login failed for ${email}: ${JSON.stringify(loginRes.body)}`);
      }

      return {
        token: loginRes.body.accessToken,
        userId: loginRes.body.user.id,
      };
    }

    // 등록이 성공했는지 확인
    if (registerRes.status !== 201 || !registerRes.body.user) {
      throw new Error(
        `Registration failed for ${email}: status=${registerRes.status}, body=${JSON.stringify(registerRes.body)}`,
      );
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

    it('/alerts/:id (PATCH) should update an alert', async () => {
      const { token, userId } = await registerAndLogin(
        `alertupdate-${Date.now()}@example.com`,
        'SecurePass123!',
        'Alert Update User',
      );

      // 알림 생성
      const createRes = await request(app.getHttpServer())
        .post('/alerts')
        .set('Authorization', `Bearer ${token}`)
        .send({
          userId,
          name: '원래 알림',
          schedule: '0 8 * * *',
          alertTypes: ['weather'],
        });

      const alertId = createRes.body.id;

      // 알림 수정
      return request(app.getHttpServer())
        .patch(`/alerts/${alertId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: '수정된 알림',
          schedule: '0 9 * * *',
        })
        .expect(200)
        .expect((res: request.Response) => {
          expect(res.body.name).toBe('수정된 알림');
          expect(res.body.schedule).toBe('0 9 * * *');
        });
    });

    it('/alerts/:id/toggle (PATCH) should toggle alert enabled status', async () => {
      const { token, userId } = await registerAndLogin(
        `alerttoggle-${Date.now()}@example.com`,
        'SecurePass123!',
        'Alert Toggle User',
      );

      // 알림 생성 (기본적으로 enabled)
      const createRes = await request(app.getHttpServer())
        .post('/alerts')
        .set('Authorization', `Bearer ${token}`)
        .send({
          userId,
          name: '토글 알림',
          schedule: '0 8 * * *',
          alertTypes: ['weather'],
        });

      const alertId = createRes.body.id;
      expect(createRes.body.enabled).toBe(true);

      // 토글 -> disabled
      const toggleRes = await request(app.getHttpServer())
        .patch(`/alerts/${alertId}/toggle`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(toggleRes.body.enabled).toBe(false);
    });

    it('/alerts/:id (DELETE) should delete an alert', async () => {
      const { token, userId } = await registerAndLogin(
        `alertdelete-${Date.now()}@example.com`,
        'SecurePass123!',
        'Alert Delete User',
      );

      // 알림 생성
      const createRes = await request(app.getHttpServer())
        .post('/alerts')
        .set('Authorization', `Bearer ${token}`)
        .send({
          userId,
          name: '삭제할 알림',
          schedule: '0 8 * * *',
          alertTypes: ['weather'],
        });

      const alertId = createRes.body.id;

      // 알림 삭제
      await request(app.getHttpServer())
        .delete(`/alerts/${alertId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // 삭제 후 조회 시 404
      return request(app.getHttpServer())
        .get(`/alerts/${alertId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });

    it('should block accessing other user alert', async () => {
      const { token: token1, userId: userId1 } = await registerAndLogin(
        `alertaccess1-${Date.now()}@example.com`,
        'SecurePass123!',
        'Alert Access User One',
      );

      const { token: token2 } = await registerAndLogin(
        `alertaccess2-${Date.now()}@example.com`,
        'SecurePass123!',
        'Alert Access User Two',
      );

      // User1이 알림 생성
      const createRes = await request(app.getHttpServer())
        .post('/alerts')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          userId: userId1,
          name: 'User1의 알림',
          schedule: '0 8 * * *',
          alertTypes: ['weather'],
        });

      const alertId = createRes.body.id;

      // User2가 User1의 알림 접근 시도 -> 403
      await request(app.getHttpServer())
        .get(`/alerts/${alertId}`)
        .set('Authorization', `Bearer ${token2}`)
        .expect(403);

      // User2가 User1의 알림 수정 시도 -> 403
      await request(app.getHttpServer())
        .patch(`/alerts/${alertId}`)
        .set('Authorization', `Bearer ${token2}`)
        .send({ name: '해킹 시도' })
        .expect(403);

      // User2가 User1의 알림 삭제 시도 -> 403
      return request(app.getHttpServer())
        .delete(`/alerts/${alertId}`)
        .set('Authorization', `Bearer ${token2}`)
        .expect(403);
    });

    it('should create alert with all options (bus, subway)', async () => {
      const { token, userId } = await registerAndLogin(
        `alertfull-${Date.now()}@example.com`,
        'SecurePass123!',
        'Full Alert User',
      );

      return request(app.getHttpServer())
        .post('/alerts')
        .set('Authorization', `Bearer ${token}`)
        .send({
          userId,
          name: '종합 출근 알림',
          schedule: '0 7 * * 1-5',
          alertTypes: ['weather', 'airQuality', 'bus', 'subway'],
          busStopId: 'bus-stop-123',
          // Note: subwayStationId must be a valid UUID, omitting for this test
        })
        .expect(201)
        .expect((res: request.Response) => {
          expect(res.body.alertTypes).toEqual(['weather', 'airQuality', 'bus', 'subway']);
          expect(res.body.busStopId).toBe('bus-stop-123');
        });
    });

    it('should manage multiple alerts for one user', async () => {
      const { token, userId } = await registerAndLogin(
        `alertmulti-${Date.now()}@example.com`,
        'SecurePass123!',
        'Multi Alert User',
      );

      // 3개의 알림 생성
      await request(app.getHttpServer())
        .post('/alerts')
        .set('Authorization', `Bearer ${token}`)
        .send({
          userId,
          name: '출근 알림',
          schedule: '0 8 * * 1-5',
          alertTypes: ['weather'],
        });

      await request(app.getHttpServer())
        .post('/alerts')
        .set('Authorization', `Bearer ${token}`)
        .send({
          userId,
          name: '퇴근 알림',
          schedule: '0 18 * * 1-5',
          alertTypes: ['weather', 'bus'],
          busStopId: 'bus-123',
        });

      await request(app.getHttpServer())
        .post('/alerts')
        .set('Authorization', `Bearer ${token}`)
        .send({
          userId,
          name: '주말 알림',
          schedule: '0 10 * * 6,0',
          alertTypes: ['airQuality'],
        });

      // 알림 목록 조회
      return request(app.getHttpServer())
        .get(`/alerts/user/${userId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .expect((res: request.Response) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBe(3);
          const names = res.body.map((a: any) => a.name);
          expect(names).toContain('출근 알림');
          expect(names).toContain('퇴근 알림');
          expect(names).toContain('주말 알림');
        });
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
