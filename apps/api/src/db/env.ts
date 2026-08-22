import { config } from 'dotenv';
import { resolve } from 'node:path';

config({ path: resolve(process.cwd(), '.env') });
config({ path: resolve(process.cwd(), '../../.env') });

function optional(name: string): string | undefined {
  const value = process.env[name];
  return value && value.length > 0 ? value : undefined;
}

function required(name: string): string {
  const value = optional(name);
  if (!value) {
    throw new Error(`Missing ${name} in .env`);
  }
  return value;
}

function resolveDatabaseUrl(raw: string): string {
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

export const dbEnv = {
  optional,
  get databaseUrl() {
    return resolveDatabaseUrl(required('DATABASE_URL'));
  },
  get supabaseUrl() {
    return required('SUPABASE_URL');
  },
  get serviceRoleKey() {
    return required('SUPABASE_SERVICE_ROLE_KEY');
  },
};
