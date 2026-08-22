import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/configure-app';
import { closeDb, getSql } from '../src/db/database';
import { dbEnv } from '../src/db/env';

const ALICE = {
  email: 'alice.lockgo@example.com',
  password: 'LockGo-Alice-1',
};
const BOB = {
  email: 'bob.lockgo@example.com',
  password: 'LockGo-Bob-1',
};

async function signIn(email: string, password: string) {
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
    throw new Error(`sign-in failed for ${email}: ${response.status}`);
  }
  const body = (await response.json()) as { access_token: string };
  return body.access_token;
}

function futureHour(offsetHours: number) {
  const start = new Date();
  start.setMinutes(0, 0, 0);
  start.setHours(start.getHours() + offsetHours);
  return start.toISOString();
}

describe('Reservations concurrency (e2e)', () => {
  let app: INestApplication<App>;
  let aliceToken: string;
  let bobToken: string;
  let moChitId: string;
  let centralId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();

    aliceToken = await signIn(ALICE.email, ALICE.password);
    bobToken = await signIn(BOB.email, BOB.password);

    const list = await request(app.getHttpServer())
      .get('/api/lockers')
      .set('Authorization', `Bearer ${aliceToken}`)
      .expect(200);

    moChitId = list.body.items.find((item: { name: string }) =>
      item.name.includes('Mo Chit'),
    ).id;
    centralId = list.body.items.find((item: { name: string }) =>
      item.name.includes('Central Station'),
    ).id;
  }, 30000);

  afterAll(async () => {
    await app.close();
    await closeDb();
  });

  it('lets only one of two concurrent bookings take the last Large slot', async () => {
    const startTime = futureHour(30);
    const payload = {
      station_id: moChitId,
      size: 'Large',
      start_time: startTime,
      duration_hours: 2,
    };

    const [first, second] = await Promise.all([
      request(app.getHttpServer())
        .post('/api/reservations')
        .set('Authorization', `Bearer ${aliceToken}`)
        .set('Idempotency-Key', `conc-alice-${startTime}`)
        .send(payload),
      request(app.getHttpServer())
        .post('/api/reservations')
        .set('Authorization', `Bearer ${bobToken}`)
        .set('Idempotency-Key', `conc-bob-${startTime}`)
        .send(payload),
    ]);

    const statuses = [first.status, second.status].sort();
    expect(statuses).toEqual([201, 409]);
    const created = first.status === 201 ? first.body : second.body;
    expect(created.reservation_number).toMatch(/^LK-/);
  });

  it('returns the same reservation when the idempotency key is reused', async () => {
    const startTime = futureHour(36);
    const key = `idem-${startTime}`;
    const payload = {
      station_id: centralId,
      size: 'Medium',
      start_time: startTime,
      duration_hours: 2,
    };

    const first = await request(app.getHttpServer())
      .post('/api/reservations')
      .set('Authorization', `Bearer ${aliceToken}`)
      .set('Idempotency-Key', key)
      .send(payload)
      .expect(201);

    const second = await request(app.getHttpServer())
      .post('/api/reservations')
      .set('Authorization', `Bearer ${aliceToken}`)
      .set('Idempotency-Key', key)
      .send(payload)
      .expect(201);

    expect(second.body.reservation_number).toBe(first.body.reservation_number);
    expect(second.body.id).toBe(first.body.id);
  });

  it('returns 409 when the chosen size has no free compartment', async () => {
    const startTime = futureHour(40);
    const payload = {
      station_id: moChitId,
      size: 'Large',
      start_time: startTime,
      duration_hours: 2,
    };

    await request(app.getHttpServer())
      .post('/api/reservations')
      .set('Authorization', `Bearer ${aliceToken}`)
      .set('Idempotency-Key', `fill-${startTime}`)
      .send(payload)
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/reservations')
      .set('Authorization', `Bearer ${bobToken}`)
      .set('Idempotency-Key', `full-${startTime}`)
      .send(payload)
      .expect(409)
      .expect((res) => {
        expect(res.body.code).toBe('NO_AVAILABILITY');
      });
  });

  it('returns 403 when another user reads a reservation by id', async () => {
    const startTime = futureHour(52);
    const created = await request(app.getHttpServer())
      .post('/api/reservations')
      .set('Authorization', `Bearer ${aliceToken}`)
      .set('Idempotency-Key', `own-${startTime}`)
      .send({
        station_id: centralId,
        size: 'Small',
        start_time: startTime,
        duration_hours: 1,
      })
      .expect(201);

    await request(app.getHttpServer())
      .get(`/api/reservations/${created.body.id}`)
      .set('Authorization', `Bearer ${bobToken}`)
      .expect(403)
      .expect((res) => {
        expect(res.body).toMatchObject({
          statusCode: 403,
          code: 'FORBIDDEN',
        });
      });

    const own = await request(app.getHttpServer())
      .get(`/api/reservations/${created.body.id}`)
      .set('Authorization', `Bearer ${aliceToken}`)
      .expect(200);

    expect(own.body.id).toBe(created.body.id);
    expect(own.body.status).toBe('Reserved');
    expect(own.body.status).not.toBe('Active');
  });

  it('lists only the current user reservations', async () => {
    const aliceStart = futureHour(56);
    const bobStart = futureHour(58);

    const aliceCreated = await request(app.getHttpServer())
      .post('/api/reservations')
      .set('Authorization', `Bearer ${aliceToken}`)
      .set('Idempotency-Key', `hist-alice-${aliceStart}`)
      .send({
        station_id: centralId,
        size: 'Small',
        start_time: aliceStart,
        duration_hours: 1,
      })
      .expect(201);

    const bobCreated = await request(app.getHttpServer())
      .post('/api/reservations')
      .set('Authorization', `Bearer ${bobToken}`)
      .set('Idempotency-Key', `hist-bob-${bobStart}`)
      .send({
        station_id: centralId,
        size: 'Small',
        start_time: bobStart,
        duration_hours: 1,
      })
      .expect(201);

    const aliceList = await request(app.getHttpServer())
      .get('/api/reservations')
      .set('Authorization', `Bearer ${aliceToken}`)
      .expect(200);

    const bobList = await request(app.getHttpServer())
      .get('/api/reservations')
      .set('Authorization', `Bearer ${bobToken}`)
      .expect(200);

    const aliceIds = aliceList.body.items.map((item: { id: string }) => item.id);
    const bobIds = bobList.body.items.map((item: { id: string }) => item.id);

    expect(aliceIds).toContain(aliceCreated.body.id);
    expect(aliceIds).not.toContain(bobCreated.body.id);
    expect(bobIds).toContain(bobCreated.body.id);
    expect(bobIds).not.toContain(aliceCreated.body.id);
  });

  it('cancels a Reserved booking so the slot can be booked again', async () => {
    const startTime = futureHour(62);
    const payload = {
      station_id: moChitId,
      size: 'Large',
      start_time: startTime,
      duration_hours: 2,
    };

    const created = await request(app.getHttpServer())
      .post('/api/reservations')
      .set('Authorization', `Bearer ${aliceToken}`)
      .set('Idempotency-Key', `cancel-alice-${startTime}`)
      .send(payload)
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/api/reservations/${created.body.id}/cancel`)
      .set('Authorization', `Bearer ${bobToken}`)
      .expect(403)
      .expect((res) => {
        expect(res.body.code).toBe('FORBIDDEN');
      });

    const cancelled = await request(app.getHttpServer())
      .patch(`/api/reservations/${created.body.id}/cancel`)
      .set('Authorization', `Bearer ${aliceToken}`)
      .expect(200);

    expect(cancelled.body.status).toBe('Cancelled');

    await request(app.getHttpServer())
      .patch(`/api/reservations/${created.body.id}/cancel`)
      .set('Authorization', `Bearer ${aliceToken}`)
      .expect(409)
      .expect((res) => {
        expect(res.body.code).toBe('CANNOT_CANCEL');
      });

    const rebooked = await request(app.getHttpServer())
      .post('/api/reservations')
      .set('Authorization', `Bearer ${bobToken}`)
      .set('Idempotency-Key', `cancel-bob-${startTime}`)
      .send(payload)
      .expect(201);

    expect(rebooked.body.status).toBe('Reserved');
    expect(rebooked.body.id).not.toBe(created.body.id);
  });

  it('does not treat a past-deadline reservation as Active', async () => {
    const startTime = futureHour(66);
    const created = await request(app.getHttpServer())
      .post('/api/reservations')
      .set('Authorization', `Bearer ${aliceToken}`)
      .set('Idempotency-Key', `expired-${startTime}`)
      .send({
        station_id: centralId,
        size: 'Small',
        start_time: startTime,
        duration_hours: 1,
      })
      .expect(201);

    const sql = getSql();
    await sql`
      UPDATE public.reservations
      SET no_show_deadline = now() - interval '1 minute'
      WHERE id = ${created.body.id}::uuid
    `;

    const got = await request(app.getHttpServer())
      .get(`/api/reservations/${created.body.id}`)
      .set('Authorization', `Bearer ${aliceToken}`)
      .expect(200);

    expect(got.body.status).toBe('Expired');
    expect(got.body.status).not.toBe('Active');
  });
});
