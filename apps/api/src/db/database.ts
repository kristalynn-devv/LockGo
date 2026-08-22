import { drizzle, PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres, { Sql } from 'postgres';
import { dbEnv } from './env';
import * as schema from './schema';

let sql: Sql | undefined;
let db: PostgresJsDatabase<typeof schema> | undefined;

export function getSql() {
  if (!sql) {
    sql = postgres(dbEnv.databaseUrl, { max: 4, ssl: 'require' });
  }
  return sql;
}

export function getDb() {
  if (!db) {
    db = drizzle(getSql(), { schema });
  }
  return db;
}
