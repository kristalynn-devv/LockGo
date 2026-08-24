import { drizzle, PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { Sql } from 'postgres';
import { dbEnv } from './env';
import { createPostgres } from './postgres-client';
import * as schema from './schema';

let sql: Sql | undefined;
let db: PostgresJsDatabase<typeof schema> | undefined;

export function getSql() {
  if (!sql) {
    sql = createPostgres(dbEnv.databaseUrl, dbEnv.sslMode, 4);
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
