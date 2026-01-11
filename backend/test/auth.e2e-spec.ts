import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { TestAppModule } from './test-app.module';

describe('Auth Service (e2e)', () => {
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

  describe('POST /auth/register', () => {
    const uniqueEmail = () => `auth-test-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;

    it('should register a new user and return JWT token', async () => {
      const email = uniqueEmail();
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email,
          password: 'SecurePass123!',
          name: 'Test User',
        })
        .expect(201);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(email);
      expect(response.body.user.name).toBe('Test User');
      expect(response.body.user).not.toHaveProperty('passwordHash');
    });

    it('should fail with duplicate email (409 Conflict)', async () => {
      const email = uniqueEmail();

      // First registration
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email, password: 'SecurePass123!', name: 'First User' })
        .expect(201);

      // Duplicate registration
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email, password: 'SecurePass123!', name: 'Second User' })
        .expect(409);
    });

    it('should fail with invalid email format (400)', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'invalid-email',
          password: 'SecurePass123!',
          name: 'Test User',
        })
        .expect(400);
    });

    it('should fail with missing required fields (400)', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: uniqueEmail() })
        .expect(400);
    });

    it('should fail with short password (400)', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: uniqueEmail(),
          password: '12345', // Too short
          name: 'Test User',
        })
        .expect(400);
    });
  });

  describe('POST /auth/login', () => {
    const testEmail = `login-test-${Date.now()}@example.com`;
    const testPassword = 'SecurePass123!';

    beforeAll(async () => {
      // Create a test user
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: testEmail,
          password: testPassword,
          name: 'Login Test User',
        });
    });

    it('should login successfully with correct credentials', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: testEmail, password: testPassword })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(testEmail);
    });

    it('should fail with wrong password (401)', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: testEmail, password: 'WrongPassword!' })
        .expect(401);
    });

    it('should fail with non-existent email (401)', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'nonexistent@example.com', password: testPassword })
        .expect(401);
    });

    it('should fail with missing fields (400)', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: testEmail })
        .expect(400);
    });
  });

  describe('Rate Limiting', () => {
    it('should block excessive login attempts (429)', async () => {
      const email = `ratelimit-${Date.now()}@example.com`;

      // Exceed rate limit (5 requests per minute)
      for (let i = 0; i < 6; i++) {
        await request(app.getHttpServer())
          .post('/auth/login')
          .send({ email, password: 'wrong' });
      }

      // 7th request should be blocked
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email, password: 'wrong' })
        .expect(429);
    });
  });

  describe('JWT Token Validation', () => {
    it('should access protected route with valid token', async () => {
      const email = `jwt-test-${Date.now()}@example.com`;

      const registerRes = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email, password: 'SecurePass123!', name: 'JWT Test' });

      const { accessToken, user } = registerRes.body;

      // Access protected route
      await request(app.getHttpServer())
        .get(`/users/${user.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });

    it('should reject access without token (401)', async () => {
      await request(app.getHttpServer())
        .get('/users/some-id')
        .expect(401);
    });

    it('should reject access with invalid token (401)', async () => {
      await request(app.getHttpServer())
        .get('/users/some-id')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });
});
