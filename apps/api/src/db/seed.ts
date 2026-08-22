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

  const userCount = await sql`SELECT count(*)::int AS n FROM public.users`;
  const stationCount =
    await sql`SELECT count(*)::int AS n FROM public.locker_stations`;
  await sql.end();

  console.log(
    `seed ok — users=${userCount[0].n} stations=${stationCount[0].n}`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
