import { drizzle, PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres, { Sql } from 'postgres';
import { dbEnv } from './env';
import * as schema from './schema';

let sql: Sql | undefined;
let db: PostgresJsDatabase<typeof schema> | undefined;

function connectionUrl() {
  const raw = dbEnv.databaseUrl;
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return raw;
  }

  if (!parsed.hostname.startsWith('db.') || !parsed.hostname.endsWith('.supabase.co')) {
    return raw;
  }

  const ref = parsed.hostname.slice('db.'.length, parsed.hostname.indexOf('.supabase.co'));
  parsed.hostname = 'aws-0-ap-southeast-2.pooler.supabase.com';
  parsed.port = '6543';
  parsed.username = `postgres.${ref}`;
  return parsed.toString();
}

export function getSql() {
  if (!sql) {
    sql = postgres(connectionUrl(), { max: 4, ssl: 'require' });
  }
  return sql;
}

export function getDb() {
  if (!db) {
    db = drizzle(getSql(), { schema });
  }
  return db;
}

export async function closeDb() {
  if (sql) {
    await sql.end();
    sql = undefined;
    db = undefined;
  }
}
