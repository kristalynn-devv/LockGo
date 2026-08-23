import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/configure-app';
import { closeDb } from '../src/db/database';
import { dbEnv } from '../src/db/env';

async function signIn() {
  const response = await fetch(
    `${dbEnv.supabaseUrl}/auth/v1/token?grant_type=password`,
    {
      method: 'POST',
      headers: {
        apikey: dbEnv.serviceRoleKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'alice.lockgo@example.com',
        password: 'LockGo-Alice-1',
      }),
    },
  );
  if (!response.ok) {
    throw new Error(`sign-in failed: ${response.status}`);
  }
  const body = (await response.json()) as { access_token: string };
  return body.access_token;
}

describe('Lockers (e2e)', () => {
  let app: INestApplication<App>;
  let token: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
    token = await signIn();
  }, 30000);

  afterAll(async () => {
    await app.close();
    await closeDb();
  });

  it('rejects locker search without a token', async () => {
    await request(app.getHttpServer()).get('/api/lockers').expect(401);
  });

  it('lists only open stations with S/M/L availability', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/lockers')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const names = response.body.items.map((item: { name: string }) => item.name);
    expect(names).toEqual(
      expect.arrayContaining([
        'Central Station',
        'Siam Square',
        'Asok',
        'Mo Chit',
      ]),
    );
    expect(names.join(' ')).not.toMatch(/Maintenance/);

    for (const item of response.body.items) {
      expect(item.available).toEqual(
        expect.objectContaining({
          Small: expect.any(Number),
          Medium: expect.any(Number),
          Large: expect.any(Number),
        }),
      );
      expect(item.starting_price).toBeGreaterThanOrEqual(30);
    }
  });

  it('filters by mock location, distance, size, and price', async () => {
    const nearby = await request(app.getHttpServer())
      .get('/api/lockers')
      .query({ location: 'si-lom', distance: 1 })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(nearby.body.items).toHaveLength(1);
    expect(nearby.body.items[0].name).toBe('Central Station');
    expect(nearby.body.items[0].distance_km).toBe(0);

    const large = await request(app.getHttpServer())
      .get('/api/lockers')
      .query({ size: 'Large', available_only: true, price: 90 })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(large.body.items.length).toBeGreaterThan(0);
    for (const item of large.body.items) {
      expect(item.available.Large).toBeGreaterThan(0);
      expect(item.starting_price).toBeLessThanOrEqual(90);
    }
  });

  it('returns the mock Bangkok locations used by the Find dropdown', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/lockers/locations')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body.items.map((item: { id: string }) => item.id)).toEqual([
      'si-lom',
      'siam',
      'asok',
      'mo-chit',
      'on-nut',
    ]);
  });
});
