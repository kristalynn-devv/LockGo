import postgres from 'postgres';

const RECOVERABLE_DISCONNECT_CODES = new Set([
  '08003',
  '08006',
  '57P01',
  '57P02',
  '57P03',
]);

export function isTransactionPooler(databaseUrl: string): boolean {
  try {
    const parsed = new URL(databaseUrl);
    return parsed.port === '6543' || parsed.hostname.includes('pooler.supabase.com');
  } catch {
    return false;
  }
}

export function postgresClientOptions(input: {
  databaseUrl: string;
  ssl: 'require' | false;
  max: number;
}) {
  return {
    max: input.max,
    ssl: input.ssl,
    idle_timeout: 20,
    max_lifetime: 60 * 10,
    connect_timeout: 30,
    prepare: !isTransactionPooler(input.databaseUrl),
  };
}

export function createPostgres(
  databaseUrl: string,
  ssl: 'require' | false,
  max: number,
) {
  return postgres(databaseUrl, postgresClientOptions({ databaseUrl, ssl, max }));
}

export function isRecoverablePostgresDisconnect(reason: unknown): boolean {
  let current = reason;
  while (current && typeof current === 'object') {
    const code = (current as { code?: string }).code;
    if (typeof code === 'string' && RECOVERABLE_DISCONNECT_CODES.has(code)) {
      return true;
    }
    current = (current as { cause?: unknown }).cause;
  }
  return false;
}

let disconnectGuardInstalled = false;

export function installPostgresDisconnectGuard() {
  if (disconnectGuardInstalled) {
    return;
  }
  disconnectGuardInstalled = true;
  process.on('unhandledRejection', (reason) => {
    if (isRecoverablePostgresDisconnect(reason)) {
      const code = (reason as { code?: string }).code ?? 'unknown';
      console.warn(
        `[LockGo] Postgres closed the connection (${code}); the next query will reconnect`,
      );
      return;
    }
    throw reason;
  });
}
