import postgres from 'postgres';
import { dbEnv } from './env';

const TEST_USERS = [
  {
    email: 'alice.lockgo@example.com',
    password: 'LockGo-Alice-1',
    name: 'Alice LockGo',
  },
  {
    email: 'bob.lockgo@example.com',
    password: 'LockGo-Bob-1',
    name: 'Bob LockGo',
  },
] as const;

const STATIONS = [
  {
    name: 'LockGo Central Station',
    address: '13 Si Lom, Bang Rak, Bangkok 10500',
    latitude: '13.729200',
    longitude: '100.529100',
    status: 'Open',
    rates: { Small: '10.00', Medium: '15.00', Large: '25.00' },
    counts: { Small: 4, Medium: 3, Large: 2 },
  },
  {
    name: 'LockGo Siam Square',
    address: '991 Rama I Rd, Pathum Wan, Bangkok 10330',
    latitude: '13.746000',
    longitude: '100.534000',
    status: 'Open',
    rates: { Small: '12.00', Medium: '18.00', Large: '28.00' },
    counts: { Small: 3, Medium: 3, Large: 2 },
  },
  {
    name: 'LockGo Asok',
    address: 'Asok Montri Rd, Watthana, Bangkok 10110',
    latitude: '13.737200',
    longitude: '100.560400',
    status: 'Open',
    rates: { Small: '11.00', Medium: '16.00', Large: '26.00' },
    counts: { Small: 3, Medium: 2, Large: 2 },
  },
  {
    name: 'LockGo Mo Chit',
    address: 'Kamphaeng Phet 2 Rd, Chatuchak, Bangkok 10900',
    latitude: '13.802400',
    longitude: '100.553400',
    status: 'Open',
    rates: { Small: '9.00', Medium: '14.00', Large: '22.00' },
    counts: { Small: 4, Medium: 2, Large: 1 },
  },
  {
    name: 'LockGo On Nut (Maintenance)',
    address: 'Sukhumvit 77, Suan Luang, Bangkok 10250',
    latitude: '13.705600',
    longitude: '100.601000',
    status: 'Maintenance',
    rates: { Small: '10.00', Medium: '15.00', Large: '25.00' },
    counts: { Small: 2, Medium: 2, Large: 1 },
  },
  {
    name: 'LockGo Sala Daeng (Closed)',
    address: 'Sala Daeng, Bang Rak, Bangkok 10500',
    latitude: '13.728400',
    longitude: '100.534200',
    status: 'Closed',
    rates: { Small: '10.00', Medium: '15.00', Large: '25.00' },
    counts: { Small: 2, Medium: 2, Large: 1 },
  },
  {
    name: 'LockGo Thonglor',
    address: 'Sukhumvit 55, Watthana, Bangkok 10110',
    latitude: '13.724000',
    longitude: '100.578000',
    status: 'Open',
    rates: { Small: '10.00', Medium: '16.00', Large: '24.00' },
    counts: { Small: 3, Medium: 0, Large: 1 },
  },
  {
    name: 'LockGo Ari Premium',
    address: 'Phahonyothin Rd, Phaya Thai, Bangkok 10400',
    latitude: '13.779600',
    longitude: '100.544600',
    status: 'Open',
    rates: { Small: '45.00', Medium: '55.00', Large: '70.00' },
    counts: { Small: 2, Medium: 2, Large: 1 },
  },
  {
    name: 'LockGo Don Mueang',
    address: 'Vibhavadi Rangsit Rd, Don Mueang, Bangkok 10210',
    latitude: '13.912600',
    longitude: '100.606700',
    status: 'Open',
    rates: { Small: '8.00', Medium: '12.00', Large: '20.00' },
    counts: { Small: 4, Medium: 2, Large: 1 },
  },
  {
    name: 'LockGo National Stadium',
    address: 'Rama I Rd, Pathum Wan, Bangkok 10330',
    latitude: '13.746500',
    longitude: '100.529000',
    status: 'Open',
    rates: { Small: '10.00', Medium: '15.00', Large: '25.00' },
    counts: { Small: 1, Medium: 0, Large: 0 },
  },
  {
    name: 'LockGo Ekkamai',
    address: 'Sukhumvit 63, Watthana, Bangkok 10110',
    latitude: '13.719500',
    longitude: '100.585200',
    status: 'Open',
    rates: { Small: '10.00', Medium: '15.00', Large: '25.00' },
    counts: { Small: 0, Medium: 1, Large: 0 },
  },
] as const;

type Size = 'Small' | 'Medium' | 'Large';

async function upsertAuthUser(user: (typeof TEST_USERS)[number]) {
  const response = await fetch(`${dbEnv.supabaseUrl}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      apikey: dbEnv.serviceRoleKey,
      Authorization: `Bearer ${dbEnv.serviceRoleKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: user.email,
      password: user.password,
      email_confirm: true,
      user_metadata: { full_name: user.name },
    }),
  });

  if (response.ok) {
    return;
  }

  const body = await response.text();
  if (response.status === 422 && body.includes('already been registered')) {
    return;
  }

  throw new Error(`Failed to seed user ${user.email}: ${response.status}`);
}

type Sql = ReturnType<typeof postgres>;

async function userIdByName(sql: Sql, name: string) {
  const rows = await sql<{ id: string }[]>`
    SELECT id FROM public.users WHERE display_name = ${name} LIMIT 1
  `;
  return rows[0]?.id;
}

async function stationIdByName(sql: Sql, name: string) {
  const rows = await sql<{ id: string }[]>`
    SELECT id FROM public.locker_stations WHERE name = ${name} LIMIT 1
  `;
  return rows[0]?.id;
}

async function compartmentId(
  sql: Sql,
  stationId: string,
  size: Size,
  label: string,
) {
  const rows = await sql<{ id: string }[]>`
    SELECT id
    FROM public.compartments
    WHERE station_id = ${stationId}::uuid
      AND size = ${size}::public.compartment_size
      AND label = ${label}
    LIMIT 1
  `;
  return rows[0]?.id;
}

async function seedScenarioReservations(sql: Sql) {
  const aliceId = await userIdByName(sql, 'Alice LockGo');
  const bobId = await userIdByName(sql, 'Bob LockGo');
  const centralId = await stationIdByName(sql, 'LockGo Central Station');
  const moChitId = await stationIdByName(sql, 'LockGo Mo Chit');
  const stadiumId = await stationIdByName(sql, 'LockGo National Stadium');
  const asokId = await stationIdByName(sql, 'LockGo Asok');

  if (!aliceId || !bobId || !centralId || !moChitId || !stadiumId || !asokId) {
    console.log('seed scenarios skipped — users or stations missing');
    return 0;
  }

  const centralMedium = await compartmentId(sql, centralId, 'Medium', 'M-01');
  const centralSmall = await compartmentId(sql, centralId, 'Small', 'S-01');
  const moChitLarge = await compartmentId(sql, moChitId, 'Large', 'L-01');
  const stadiumSmall = await compartmentId(sql, stadiumId, 'Small', 'S-01');
  const asokSmall = await compartmentId(sql, asokId, 'Small', 'S-01');
  if (
    !centralMedium ||
    !centralSmall ||
    !moChitLarge ||
    !stadiumSmall ||
    !asokSmall
  ) {
    console.log('seed scenarios skipped — compartments missing');
    return 0;
  }

  await sql`
    DELETE FROM public.idempotency_keys
    WHERE key LIKE 'seed-%'
  `;
  await sql`
    DELETE FROM public.reservations
    WHERE reservation_number LIKE 'LK-SEED-%'
  `;
  await sql`
    DELETE FROM public.reservations
    WHERE compartment_id = ${centralMedium}::uuid
      AND tstzrange(start_time, end_time, '[)') && tstzrange(
        date_trunc('hour', clock_timestamp()) + interval '3 hours',
        date_trunc('hour', clock_timestamp()) + interval '7 hours',
        '[)'
      )
  `;
  await sql`
    DELETE FROM public.reservations
    WHERE compartment_id = ${centralSmall}::uuid
      AND (
        tstzrange(start_time, end_time, '[)') && tstzrange(
          date_trunc('hour', clock_timestamp()) + interval '8 hours',
          date_trunc('hour', clock_timestamp()) + interval '9 hours',
          '[)'
        )
        OR tstzrange(start_time, end_time, '[)') && tstzrange(
          clock_timestamp() - interval '2 hours',
          clock_timestamp() - interval '1 hour',
          '[)'
        )
      )
  `;
  await sql`
    DELETE FROM public.reservations
    WHERE compartment_id = ${moChitLarge}::uuid
      AND tstzrange(start_time, end_time, '[)') && tstzrange(
        date_trunc('hour', clock_timestamp()) + interval '6 hours',
        date_trunc('hour', clock_timestamp()) + interval '8 hours',
        '[)'
      )
  `;
  await sql`
    DELETE FROM public.reservations
    WHERE compartment_id = ${stadiumSmall}::uuid
      AND tstzrange(start_time, end_time, '[)') && tstzrange(
        clock_timestamp(),
        clock_timestamp() + interval '2 hours',
        '[)'
      )
  `;
  await sql`
    DELETE FROM public.reservations
    WHERE compartment_id = ${asokSmall}::uuid
      AND tstzrange(start_time, end_time, '[)') && tstzrange(
        clock_timestamp() - interval '30 minutes',
        clock_timestamp() + interval '90 minutes',
        '[)'
      )
  `;

  const aliceReserved = await sql<{ id: string }[]>`
    INSERT INTO public.reservations (
      reservation_number, user_id, compartment_id,
      start_time, end_time, no_show_deadline, status,
      unit_price, duration_hours, total_price
    )
    VALUES (
      'LK-SEED-ALICE-CANCEL',
      ${aliceId}::uuid,
      ${centralMedium}::uuid,
      date_trunc('hour', clock_timestamp()) + interval '3 hours',
      date_trunc('hour', clock_timestamp()) + interval '7 hours',
      date_trunc('hour', clock_timestamp()) + interval '3 hours 15 minutes',
      'Reserved',
      15.00,
      4,
      60.00
    )
    RETURNING id
  `;

  await sql`
    INSERT INTO public.reservations (
      reservation_number, user_id, compartment_id,
      start_time, end_time, no_show_deadline, status,
      unit_price, duration_hours, total_price
    )
    VALUES (
      'LK-SEED-ALICE-CANCELLED',
      ${aliceId}::uuid,
      ${centralSmall}::uuid,
      date_trunc('hour', clock_timestamp()) + interval '8 hours',
      date_trunc('hour', clock_timestamp()) + interval '9 hours',
      date_trunc('hour', clock_timestamp()) + interval '8 hours 15 minutes',
      'Cancelled',
      10.00,
      1,
      30.00
    )
  `;

  await sql`
    INSERT INTO public.reservations (
      reservation_number, user_id, compartment_id,
      start_time, end_time, no_show_deadline, status,
      unit_price, duration_hours, total_price
    )
    VALUES (
      'LK-SEED-ALICE-EXPIRED',
      ${aliceId}::uuid,
      ${centralSmall}::uuid,
      clock_timestamp() - interval '2 hours',
      clock_timestamp() - interval '1 hour',
      clock_timestamp() - interval '1 hour 45 minutes',
      'Expired',
      10.00,
      1,
      30.00
    )
  `;

  await sql`
    INSERT INTO public.reservations (
      reservation_number, user_id, compartment_id,
      start_time, end_time, no_show_deadline, status,
      unit_price, duration_hours, total_price
    )
    VALUES (
      'LK-SEED-BOB-LARGE',
      ${bobId}::uuid,
      ${moChitLarge}::uuid,
      date_trunc('hour', clock_timestamp()) + interval '6 hours',
      date_trunc('hour', clock_timestamp()) + interval '8 hours',
      date_trunc('hour', clock_timestamp()) + interval '6 hours 15 minutes',
      'Reserved',
      22.00,
      2,
      44.00
    )
  `;

  await sql`
    INSERT INTO public.reservations (
      reservation_number, user_id, compartment_id,
      start_time, end_time, no_show_deadline, status,
      unit_price, duration_hours, total_price
    )
    VALUES (
      'LK-SEED-STADIUM-NOW',
      ${aliceId}::uuid,
      ${stadiumSmall}::uuid,
      clock_timestamp(),
      clock_timestamp() + interval '2 hours',
      clock_timestamp() + interval '15 minutes',
      'Reserved',
      10.00,
      2,
      30.00
    )
  `;

  await sql`
    INSERT INTO public.reservations (
      reservation_number, user_id, compartment_id,
      start_time, end_time, no_show_deadline, status,
      unit_price, duration_hours, total_price
    )
    VALUES (
      'LK-SEED-ALICE-NOSHOW',
      ${aliceId}::uuid,
      ${asokSmall}::uuid,
      clock_timestamp() - interval '30 minutes',
      clock_timestamp() + interval '90 minutes',
      clock_timestamp() - interval '15 minutes',
      'Reserved',
      11.00,
      2,
      30.00
    )
  `;

  const reservationId = aliceReserved[0].id;
  await sql`
    INSERT INTO public.idempotency_keys (user_id, key, reservation_id, response_body)
    VALUES (
      ${aliceId}::uuid,
      'seed-alice-repeat',
      ${reservationId}::uuid,
      ${sql.json({
        id: reservationId,
        reservation_number: 'LK-SEED-ALICE-CANCEL',
        station_name: 'LockGo Central Station',
        status: 'Reserved',
      })}
    )
  `;

  return 6;
}

async function main() {
  for (const user of TEST_USERS) {
    await upsertAuthUser(user);
  }

  const sql = postgres(dbEnv.databaseUrl, { max: 1, ssl: 'require' });

  for (const station of STATIONS) {
    const rows = await sql<{ id: string }[]>`
      INSERT INTO public.locker_stations (name, address, latitude, longitude, status)
      VALUES (
        ${station.name},
        ${station.address},
        ${station.latitude},
        ${station.longitude},
        ${station.status}::public.station_status
      )
      ON CONFLICT (name) DO UPDATE
        SET
          address = EXCLUDED.address,
          latitude = EXCLUDED.latitude,
          longitude = EXCLUDED.longitude,
          status = EXCLUDED.status
      RETURNING id
    `;

    const stationId = rows[0].id;

    for (const size of ['Small', 'Medium', 'Large'] as Size[]) {
      await sql`
        INSERT INTO public.station_pricing (station_id, size, rate_per_hour)
        VALUES (
          ${stationId},
          ${size}::public.compartment_size,
          ${station.rates[size]}
        )
        ON CONFLICT (station_id, size) DO UPDATE
          SET rate_per_hour = EXCLUDED.rate_per_hour
      `;

      const prefix = size[0];
      for (let i = 1; i <= station.counts[size]; i += 1) {
        const label = `${prefix}-${String(i).padStart(2, '0')}`;
        await sql`
          INSERT INTO public.compartments (station_id, size, label)
          VALUES (
            ${stationId},
            ${size}::public.compartment_size,
            ${label}
          )
          ON CONFLICT (station_id, label) DO NOTHING
        `;
      }
    }
  }

  const scenarios = await seedScenarioReservations(sql);

  const userCount = await sql`SELECT count(*)::int AS n FROM public.users`;
  const stationCount =
    await sql`SELECT count(*)::int AS n FROM public.locker_stations`;
  await sql.end();

  console.log(
    `seed ok — users=${userCount[0].n} stations=${stationCount[0].n} scenarios=${scenarios}`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
