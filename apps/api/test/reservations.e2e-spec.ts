import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/configure-app';
import { closeDb } from '../src/db/database';
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
});
