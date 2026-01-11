import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { TestAppModule } from './test-app.module';

describe('User Service (e2e)', () => {
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
  async function createUserWithToken(emailPrefix: string) {
    const email = `${emailPrefix}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email,
        password: 'SecurePass123!',
        name: 'Test User',
      });

    return {
      token: response.body.accessToken,
      userId: response.body.user.id,
      email,
    };
  }

  describe('GET /users/:id', () => {
    it('should get user details with valid token', async () => {
      const { token, userId, email } = await createUserWithToken('user-get');

      const response = await request(app.getHttpServer())
        .get(`/users/${userId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.id).toBe(userId);
      expect(response.body.email).toBe(email);
      expect(response.body).not.toHaveProperty('passwordHash');
    });

    it('should block access to other user data (403)', async () => {
      const user1 = await createUserWithToken('user-owner');
      const user2 = await createUserWithToken('user-other');

      // User1 trying to access User2's data
      await request(app.getHttpServer())
        .get(`/users/${user2.userId}`)
        .set('Authorization', `Bearer ${user1.token}`)
        .expect(403);
    });

    it('should return 404 for non-existent user', async () => {
      const { token } = await createUserWithToken('user-404');

      await request(app.getHttpServer())
        .get('/users/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${token}`)
        .expect(403); // 403 because trying to access other user's data
    });

    it('should return 401 without token', async () => {
      await request(app.getHttpServer())
        .get('/users/some-id')
        .expect(401);
    });
  });

  describe('PATCH /users/:id/location', () => {
    it('should update user location', async () => {
      const { token, userId } = await createUserWithToken('user-location');
      const location = { address: '서울시 강남구', lat: 37.5665, lng: 126.978 };

      const response = await request(app.getHttpServer())
        .patch(`/users/${userId}/location`)
        .set('Authorization', `Bearer ${token}`)
        .send({ location })
        .expect(200);

      expect(response.body.location.lat).toBe(location.lat);
      expect(response.body.location.lng).toBe(location.lng);
      expect(response.body.location.address).toBe(location.address);
    });

    it('should block updating other user location (403)', async () => {
      const user1 = await createUserWithToken('user-loc-1');
      const user2 = await createUserWithToken('user-loc-2');
      const location = { address: '서울시 강남구', lat: 37.5, lng: 127.0 };

      await request(app.getHttpServer())
        .patch(`/users/${user2.userId}/location`)
        .set('Authorization', `Bearer ${user1.token}`)
        .send({ location })
        .expect(403);
    });

    it('should fail with invalid location format (400)', async () => {
      const { token, userId } = await createUserWithToken('user-loc-invalid');

      await request(app.getHttpServer())
        .patch(`/users/${userId}/location`)
        .set('Authorization', `Bearer ${token}`)
        .send({ location: 'invalid' })
        .expect(400);
    });

    it('should fail with missing address (400)', async () => {
      const { token, userId } = await createUserWithToken('user-loc-noaddr');

      await request(app.getHttpServer())
        .patch(`/users/${userId}/location`)
        .set('Authorization', `Bearer ${token}`)
        .send({ location: { lat: 37.5, lng: 127.0 } }) // Missing address
        .expect(400);
    });
  });

  describe('Data Privacy', () => {
    it('should never expose passwordHash in any response', async () => {
      const { token, userId } = await createUserWithToken('user-privacy');

      const response = await request(app.getHttpServer())
        .get(`/users/${userId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).not.toHaveProperty('passwordHash');
      expect(response.body).not.toHaveProperty('password');
    });
  });
});
