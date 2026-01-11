import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { TestAppModule } from './test-app.module';

describe('Alert Service (e2e)', () => {
  let app: INestApplication;

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
  });

  afterAll(async () => {
    await app.close();
  });

  // Helper function
  async function createUserWithToken(prefix: string) {
    const email = `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email,
        password: 'SecurePass123!',
        name: 'Alert Test User',
      });

    return {
      token: response.body.accessToken,
      userId: response.body.user.id,
    };
  }

  describe('POST /alerts', () => {
    it('should create a new alert', async () => {
      const { token, userId } = await createUserWithToken('alert-create');

      const response = await request(app.getHttpServer())
        .post('/alerts')
        .set('Authorization', `Bearer ${token}`)
        .send({
          userId,
          name: '출근 알림',
          schedule: '0 8 * * 1-5',
          alertTypes: ['weather'],
        })
        .expect(201);

      expect(response.body.name).toBe('출근 알림');
      expect(response.body.schedule).toBe('0 8 * * 1-5');
      expect(response.body.alertTypes).toEqual(['weather']);
      expect(response.body.enabled).toBe(true);
    });

    it('should create alert with all options (bus, subway)', async () => {
      const { token, userId } = await createUserWithToken('alert-full');

      const response = await request(app.getHttpServer())
        .post('/alerts')
        .set('Authorization', `Bearer ${token}`)
        .send({
          userId,
          name: '종합 출근 알림',
          schedule: '0 7 * * 1-5',
          alertTypes: ['weather', 'airQuality', 'bus', 'subway'],
          busStopId: 'bus-stop-123',
        })
        .expect(201);

      expect(response.body.alertTypes).toEqual(['weather', 'airQuality', 'bus', 'subway']);
      expect(response.body.busStopId).toBe('bus-stop-123');
    });

    it('should block creating alert for other user (403)', async () => {
      const user1 = await createUserWithToken('alert-owner-1');
      const user2 = await createUserWithToken('alert-owner-2');

      await request(app.getHttpServer())
        .post('/alerts')
        .set('Authorization', `Bearer ${user1.token}`)
        .send({
          userId: user2.userId,
          name: '해킹 시도',
          schedule: '0 8 * * *',
          alertTypes: ['weather'],
        })
        .expect(403);
    });

    it('should fail with missing required fields (400)', async () => {
      const { token, userId } = await createUserWithToken('alert-invalid');

      await request(app.getHttpServer())
        .post('/alerts')
        .set('Authorization', `Bearer ${token}`)
        .send({ userId })
        .expect(400);
    });
  });

  describe('GET /alerts/user/:userId', () => {
    it('should return user alerts list', async () => {
      const { token, userId } = await createUserWithToken('alert-list');

      // Create multiple alerts
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

      const response = await request(app.getHttpServer())
        .get(`/alerts/user/${userId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(2);
    });

    it('should return empty array for new user', async () => {
      const { token, userId } = await createUserWithToken('alert-empty');

      const response = await request(app.getHttpServer())
        .get(`/alerts/user/${userId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toEqual([]);
    });

    it('should block accessing other user alerts (403)', async () => {
      const user1 = await createUserWithToken('alert-access-1');
      const user2 = await createUserWithToken('alert-access-2');

      await request(app.getHttpServer())
        .get(`/alerts/user/${user2.userId}`)
        .set('Authorization', `Bearer ${user1.token}`)
        .expect(403);
    });
  });

  describe('GET /alerts/:id', () => {
    it('should get alert details', async () => {
      const { token, userId } = await createUserWithToken('alert-get');

      const createRes = await request(app.getHttpServer())
        .post('/alerts')
        .set('Authorization', `Bearer ${token}`)
        .send({
          userId,
          name: '테스트 알림',
          schedule: '0 9 * * *',
          alertTypes: ['weather'],
        });

      const alertId = createRes.body.id;

      const response = await request(app.getHttpServer())
        .get(`/alerts/${alertId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.id).toBe(alertId);
      expect(response.body.name).toBe('테스트 알림');
    });

    it('should block accessing other user alert (403)', async () => {
      const user1 = await createUserWithToken('alert-detail-1');
      const user2 = await createUserWithToken('alert-detail-2');

      const createRes = await request(app.getHttpServer())
        .post('/alerts')
        .set('Authorization', `Bearer ${user1.token}`)
        .send({
          userId: user1.userId,
          name: 'User1 알림',
          schedule: '0 8 * * *',
          alertTypes: ['weather'],
        });

      await request(app.getHttpServer())
        .get(`/alerts/${createRes.body.id}`)
        .set('Authorization', `Bearer ${user2.token}`)
        .expect(403);
    });
  });

  describe('PATCH /alerts/:id', () => {
    it('should update alert', async () => {
      const { token, userId } = await createUserWithToken('alert-update');

      const createRes = await request(app.getHttpServer())
        .post('/alerts')
        .set('Authorization', `Bearer ${token}`)
        .send({
          userId,
          name: '원래 이름',
          schedule: '0 8 * * *',
          alertTypes: ['weather'],
        });

      const response = await request(app.getHttpServer())
        .patch(`/alerts/${createRes.body.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: '수정된 이름',
          schedule: '0 9 * * *',
        })
        .expect(200);

      expect(response.body.name).toBe('수정된 이름');
      expect(response.body.schedule).toBe('0 9 * * *');
    });

    it('should block updating other user alert (403)', async () => {
      const user1 = await createUserWithToken('alert-upd-1');
      const user2 = await createUserWithToken('alert-upd-2');

      const createRes = await request(app.getHttpServer())
        .post('/alerts')
        .set('Authorization', `Bearer ${user1.token}`)
        .send({
          userId: user1.userId,
          name: 'User1 알림',
          schedule: '0 8 * * *',
          alertTypes: ['weather'],
        });

      await request(app.getHttpServer())
        .patch(`/alerts/${createRes.body.id}`)
        .set('Authorization', `Bearer ${user2.token}`)
        .send({ name: '해킹 시도' })
        .expect(403);
    });
  });

  describe('PATCH /alerts/:id/toggle', () => {
    it('should toggle alert enabled status', async () => {
      const { token, userId } = await createUserWithToken('alert-toggle');

      const createRes = await request(app.getHttpServer())
        .post('/alerts')
        .set('Authorization', `Bearer ${token}`)
        .send({
          userId,
          name: '토글 테스트',
          schedule: '0 8 * * *',
          alertTypes: ['weather'],
        });

      expect(createRes.body.enabled).toBe(true);

      const toggleRes = await request(app.getHttpServer())
        .patch(`/alerts/${createRes.body.id}/toggle`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(toggleRes.body.enabled).toBe(false);

      const toggleRes2 = await request(app.getHttpServer())
        .patch(`/alerts/${createRes.body.id}/toggle`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(toggleRes2.body.enabled).toBe(true);
    });
  });

  describe('DELETE /alerts/:id', () => {
    it('should delete alert', async () => {
      const { token, userId } = await createUserWithToken('alert-delete');

      const createRes = await request(app.getHttpServer())
        .post('/alerts')
        .set('Authorization', `Bearer ${token}`)
        .send({
          userId,
          name: '삭제할 알림',
          schedule: '0 8 * * *',
          alertTypes: ['weather'],
        });

      await request(app.getHttpServer())
        .delete(`/alerts/${createRes.body.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Verify deleted
      await request(app.getHttpServer())
        .get(`/alerts/${createRes.body.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });

    it('should block deleting other user alert (403)', async () => {
      const user1 = await createUserWithToken('alert-del-1');
      const user2 = await createUserWithToken('alert-del-2');

      const createRes = await request(app.getHttpServer())
        .post('/alerts')
        .set('Authorization', `Bearer ${user1.token}`)
        .send({
          userId: user1.userId,
          name: 'User1 알림',
          schedule: '0 8 * * *',
          alertTypes: ['weather'],
        });

      await request(app.getHttpServer())
        .delete(`/alerts/${createRes.body.id}`)
        .set('Authorization', `Bearer ${user2.token}`)
        .expect(403);
    });
  });
});
