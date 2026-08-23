import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/configure-app';
import { closeDb, getSql } from '../src/db/database';
import { dbEnv } from '../src/db/env';

async function signInAs(email: string, password: string) {
  const response = await fetch(
    `${dbEnv.supabaseUrl}/auth/v1/token?grant_type=password`,
    {
      method: 'POST',
      headers: {
        apikey: dbEnv.serviceRoleKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    },
  );
  if (!response.ok) {
    throw new Error(`sign-in failed: ${response.status}`);
  }
  const body = (await response.json()) as { access_token: string };
  return body.access_token;
}

describe('Admin (e2e)', () => {
  let app: INestApplication<App>;
  let adminToken: string;
  let userToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
    adminToken = await signInAs('carol.lockgo@example.com', 'LockGo-Carol-1');
    userToken = await signInAs('alice.lockgo@example.com', 'LockGo-Alice-1');
  }, 30000);

  afterAll(async () => {
    await app.close();
    await closeDb();
  });

  it('rejects admin routes without a token', async () => {
    await request(app.getHttpServer()).get('/api/admin/summary').expect(401);
  });

  it('rejects a non-admin user with 403', async () => {
    await request(app.getHttpServer())
      .get('/api/admin/summary')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(403);
  });

  it('GET /api/me reports the caller role', async () => {
    const admin = await request(app.getHttpServer())
      .get('/api/me')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(admin.body.role).toBe('admin');

    const user = await request(app.getHttpServer())
      .get('/api/me')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);
    expect(user.body.role).toBe('user');
  });

  it('GET /api/admin/summary returns headline numbers', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/admin/summary')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(response.body).toEqual(
      expect.objectContaining({
        stations: expect.objectContaining({
          Open: expect.any(Number),
          Maintenance: expect.any(Number),
          Closed: expect.any(Number),
          total: expect.any(Number),
        }),
        reservations_active_today: expect.any(Number),
        revenue_today: expect.any(Number),
        revenue_this_month: expect.any(Number),
        reservations_total: expect.any(Number),
      }),
    );
  });

  it('GET /api/admin/reservations lists reservations across users', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/admin/reservations')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(Array.isArray(response.body.items)).toBe(true);
    for (const item of response.body.items) {
      expect(item).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          user_id: expect.any(String),
          station_name: expect.any(String),
          status: expect.any(String),
        }),
      );
    }
  });

  it('GET /api/admin/payments lists payments across users', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/admin/payments')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(Array.isArray(response.body.items)).toBe(true);
    for (const item of response.body.items) {
      expect(item).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          reservation_number: expect.any(String),
          amount: expect.any(Number),
        }),
      );
    }
  });

  describe('station management', () => {
    let stationId: string;

    it('creates a station', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/admin/stations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'E2E QA Station',
          address: 'QA Address',
          latitude: 13.7,
          longitude: 100.5,
        })
        .expect(201);

      stationId = response.body.id;
      expect(response.body.status).toBe('Open');
      expect(response.body.compartments).toEqual([]);
    });

    it('rejects an invalid create payload', async () => {
      await request(app.getHttpServer())
        .post('/api/admin/stations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: '',
          address: 'x',
          latitude: 'not-a-number',
          longitude: 100.5,
        })
        .expect(400);
    });

    it('updates a station', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/admin/stations/${stationId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'Maintenance' })
        .expect(200);

      expect(response.body.status).toBe('Maintenance');
    });

    it('adds a compartment and rejects a duplicate label', async () => {
      await request(app.getHttpServer())
        .post(`/api/admin/stations/${stationId}/compartments`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ size: 'Small', label: 'S-01' })
        .expect(201);

      const conflict = await request(app.getHttpServer())
        .post(`/api/admin/stations/${stationId}/compartments`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ size: 'Small', label: 'S-01' })
        .expect(409);

      expect(conflict.body.code).toBe('DUPLICATE_LABEL');
    });

    it('upserts pricing', async () => {
      const response = await request(app.getHttpServer())
        .put(`/api/admin/stations/${stationId}/pricing/Small`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ rate_per_hour: 12.5 })
        .expect(200);

      expect(response.body.pricing.Small).toBe(12.5);
    });

    afterAll(async () => {
      const sql = getSql();
      await sql`DELETE FROM public.locker_stations WHERE id = ${stationId}::uuid`;
    });
  });
});
