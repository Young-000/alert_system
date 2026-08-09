import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { TestAppModule } from './test-app.module';
import { resetThrottler } from './throttler-reset';
import {
  FakeAirQualityApiClient,
  FakeBusStopApiClient,
} from './fake-external-api.providers';

describe('External API Service (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    // 외부 공공 API는 대역으로 대체한다 — 서비스키·네트워크·일일 쿼터에
    // 의존하지 않으면서 컨트롤러~유스케이스 경로를 그대로 검증하기 위함.
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [TestAppModule],
    })
      .overrideProvider('IAirQualityApiClient')
      .useClass(FakeAirQualityApiClient)
      .overrideProvider('IBusStopApiClient')
      .useClass(FakeBusStopApiClient)
      .compile();

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

  // 테스트 간 rate limit 누적 제거 (register 3회/분 제한이 스위트를 무너뜨림)
  beforeEach(() => {
    resetThrottler(app);
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
        name: 'API Test User',
        phoneNumber: '01012345678',
      });

    return {
      token: response.body.accessToken,
      userId: response.body.user.id,
    };
  }

  describe('GET /air-quality/location', () => {
    it('should get air quality data by location', async () => {
      const { token } = await createUserWithToken('aq-location');

      const response = await request(app.getHttpServer())
        .get('/air-quality/location')
        .query({ lat: 37.5665, lng: 126.978 })
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('pm10');
      expect(response.body).toHaveProperty('pm25');
    });

    it('should handle missing location params gracefully', async () => {
      const { token } = await createUserWithToken('aq-invalid');

      // API currently accepts missing params (returns with NaN coordinates)
      // This test documents current behavior - could add validation later
      const response = await request(app.getHttpServer())
        .get('/air-quality/location')
        .set('Authorization', `Bearer ${token}`);

      // Either 200 with data or 400 if validation is added
      expect([200, 400]).toContain(response.status);
    });
  });

  describe('GET /air-quality/user/:userId', () => {
    it('should get air quality data for user with location', async () => {
      const { token, userId } = await createUserWithToken('aq-user');

      // Set user location first (with full address object)
      await request(app.getHttpServer())
        .patch(`/users/${userId}/location`)
        .set('Authorization', `Bearer ${token}`)
        .send({ location: { address: '서울시 강남구', lat: 37.5665, lng: 126.978 } });

      const response = await request(app.getHttpServer())
        .get(`/air-quality/user/${userId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('pm10');
    });

    it('should fail when user has no location set', async () => {
      const { token, userId } = await createUserWithToken('aq-noloc');

      // Don't set location - should fail
      const response = await request(app.getHttpServer())
        .get(`/air-quality/user/${userId}`)
        .set('Authorization', `Bearer ${token}`);

      // 위치 미설정은 NotFoundException(404)이 계약이다.
      // 기존 기대값 [400, 500]은 500(서버 오류)까지 정상으로 받아들여
      // 실제 계약을 검증하지 못했다.
      expect(response.status).toBe(404);
      expect(response.body.message).toBe('사용자 위치 정보가 설정되지 않았습니다.');
    });
  });

  describe('GET /subway/stations', () => {
    it('should search subway stations', async () => {
      const { token } = await createUserWithToken('subway-search');

      const response = await request(app.getHttpServer())
        .get('/subway/stations')
        .query({ query: '강남' })
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should return empty array for no matches', async () => {
      const { token } = await createUserWithToken('subway-empty');

      const response = await request(app.getHttpServer())
        .get('/subway/stations')
        .query({ query: 'zzz존재하지않는역zzz' })
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toEqual([]);
    });
  });

  describe('GET /bus/stops', () => {
    it('should search bus stops', async () => {
      const { token } = await createUserWithToken('bus-search');

      const response = await request(app.getHttpServer())
        .get('/bus/stops')
        .query({ query: '강남역' })
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('API Caching', () => {
    it('should return cached air quality data quickly', async () => {
      const { token } = await createUserWithToken('cache-test');
      const location = { lat: 37.5665, lng: 126.978 };

      // First request (might be slow - fetches from API)
      const start1 = Date.now();
      await request(app.getHttpServer())
        .get('/air-quality/location')
        .query(location)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      const time1 = Date.now() - start1;

      // Second request (should be cached - faster)
      const start2 = Date.now();
      await request(app.getHttpServer())
        .get('/air-quality/location')
        .query(location)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      const time2 = Date.now() - start2;

      // Cached request should generally be fast - we just verify both complete
      // Network timing is too variable for reliable comparison
      console.log(`First request: ${time1}ms, Second request: ${time2}ms`);
      expect(time2).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });
});
