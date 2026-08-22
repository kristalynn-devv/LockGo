import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { configureApp } from './../src/configure-app';

describe('API (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
  });

  it('GET /api returns hello', () => {
    return request(app.getHttpServer())
      .get('/api')
      .expect(200)
      .expect('Hello World!');
  });

  it('GET /api/lockers without a token returns 401', () => {
    return request(app.getHttpServer())
      .get('/api/lockers')
      .expect(401)
      .expect((res) => {
        expect(res.body.code).toBe('UNAUTHORIZED');
      });
  });

  it('POST /api/reservations without a token returns 401', () => {
    return request(app.getHttpServer())
      .post('/api/reservations')
      .send({})
      .expect(401);
  });

  afterEach(async () => {
    await app.close();
  });
});
