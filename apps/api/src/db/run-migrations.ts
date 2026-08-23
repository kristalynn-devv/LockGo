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
    try {
      await sql.begin(async (tx) => {
        await tx.unsafe(body);
        await tx`INSERT INTO private.lockgo_hand_migrations (name) VALUES (${name})`;
      });
      console.log(`applied hand migration ${name}`);
    } catch (error) {
      if (!alreadyPresent(error)) {
        throw error;
      }
      await sql`
        INSERT INTO private.lockgo_hand_migrations (name)
        VALUES (${name})
        ON CONFLICT (name) DO NOTHING
      `;
      console.log(`hand migration ${name} already present, recording`);
    }
  }
}

function alreadyPresent(error: unknown): boolean {
  let current: unknown = error;
  while (current && typeof current === 'object') {
    const code = (current as { code?: string }).code;
    const message = String((current as { message?: string }).message ?? '');
    if (code === '42710' || /already exists/i.test(message)) {
      return true;
    }
    current = (current as { cause?: unknown }).cause;
  }
  return false;
}

async function main() {
  const client = postgres(dbEnv.databaseUrl, { max: 1, ssl: dbEnv.sslMode });
  const db = drizzle(client);

  try {
    await migrate(db, {
      migrationsFolder: resolve(__dirname, '../../drizzle'),
    });
    console.log('applied drizzle migrations');
  } catch (error) {
    if (!alreadyPresent(error)) {
      throw error;
    }
    console.log('drizzle schema already present, skipping generated set');
  }

  await applyHandMigrations(client);
  await client.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
