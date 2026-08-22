import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import postgres from 'postgres';
import { dbEnv } from './env';

async function applyHandMigrations(sql: postgres.Sql) {
  await sql`CREATE SCHEMA IF NOT EXISTS private`;
  await sql`
    CREATE TABLE IF NOT EXISTS private.lockgo_hand_migrations (
      name text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `;

  const dir = resolve(__dirname, '../../../../supabase/migrations');
  const files = (await readdir(dir))
    .filter((name) => name.endsWith('.sql'))
    .sort();

  for (const name of files) {
    const applied = await sql<
      { name: string }[]
    >`SELECT name FROM private.lockgo_hand_migrations WHERE name = ${name}`;
    if (applied.length > 0) {
      continue;
    }

    const body = await readFile(resolve(dir, name), 'utf8');
    await sql.begin(async (tx) => {
      await tx.unsafe(body);
      await tx`INSERT INTO private.lockgo_hand_migrations (name) VALUES (${name})`;
    });
    console.log(`applied hand migration ${name}`);
  }
}

async function main() {
  const client = postgres(dbEnv.databaseUrl, { max: 1, ssl: 'require' });
  const db = drizzle(client);

  await migrate(db, {
    migrationsFolder: resolve(__dirname, '../../drizzle'),
  });
  console.log('applied drizzle migrations');

  await applyHandMigrations(client);
  await client.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
