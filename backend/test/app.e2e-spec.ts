import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
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
    await app.init();

    dataSource = moduleFixture.get<DataSource>(DataSource);
  });

  afterAll(async () => {
    await app.close();
  });

  it('/users (POST) should create a user', () => {
    return request(app.getHttpServer())
      .post('/users')
      .send({
        email: 'test@example.com',
        name: 'Test User',
      })
      .expect(201)
      .expect((res) => {
        expect(res.body.email).toBe('test@example.com');
        expect(res.body.name).toBe('Test User');
      });
  });

  it('/users/:id (GET) should return a user', async () => {
    const createResponse = await request(app.getHttpServer())
      .post('/users')
      .send({
        email: 'test2@example.com',
        name: 'Test User 2',
      });

    const userId = createResponse.body.id;

    return request(app.getHttpServer())
      .get(`/users/${userId}`)
      .expect(200)
      .expect((res) => {
        expect(res.body.email).toBe('test2@example.com');
      });
  });

  it('/alerts (POST) should create an alert', async () => {
    const createUserResponse = await request(app.getHttpServer())
      .post('/users')
      .send({
        email: 'alertuser@example.com',
        name: 'Alert User',
      });

    const userId = createUserResponse.body.id;

    return request(app.getHttpServer())
      .post('/alerts')
      .send({
        userId,
        name: '출근 알림',
        schedule: '0 8 * * *',
        alertTypes: ['weather'],
      })
      .expect(201)
      .expect((res) => {
        expect(res.body.name).toBe('출근 알림');
        expect(res.body.schedule).toBe('0 8 * * *');
      });
  });

  it('/alerts/user/:userId (GET) should return user alerts', async () => {
    const createUserResponse = await request(app.getHttpServer())
      .post('/users')
      .send({
        email: 'alertuser2@example.com',
        name: 'Alert User 2',
      });

    const userId = createUserResponse.body.id;

    await request(app.getHttpServer())
      .post('/alerts')
      .send({
        userId,
        name: '출근 알림',
        schedule: '0 8 * * *',
        alertTypes: ['weather'],
      });

    return request(app.getHttpServer())
      .get(`/alerts/user/${userId}`)
      .expect(200)
      .expect((res) => {
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBeGreaterThan(0);
      });
  });
});

