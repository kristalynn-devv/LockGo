import {
  isRecoverablePostgresDisconnect,
  isTransactionPooler,
  postgresClientOptions,
} from './postgres-client';

describe('postgres client', () => {
  const poolerUrl =
    'postgresql://postgres.ref:pass@aws-0-ap-southeast-2.pooler.supabase.com:6543/postgres';
  const localUrl = 'postgresql://postgres:postgres@127.0.0.1:5432/lockgo';

  it('disables prepared statements on the Supabase transaction pooler', () => {
    expect(isTransactionPooler(poolerUrl)).toBe(true);
    expect(
      postgresClientOptions({ databaseUrl: poolerUrl, ssl: 'require', max: 4 }).prepare,
    ).toBe(false);
  });

  it('keeps prepared statements for local Postgres', () => {
    expect(isTransactionPooler(localUrl)).toBe(false);
    expect(
      postgresClientOptions({ databaseUrl: localUrl, ssl: false, max: 1 }).prepare,
    ).toBe(true);
  });

  it('treats administrator terminate (57P01) as a reconnectable disconnect', () => {
    expect(isRecoverablePostgresDisconnect({ code: '57P01' })).toBe(true);
    expect(isRecoverablePostgresDisconnect({ cause: { code: '57P01' } })).toBe(true);
    expect(isRecoverablePostgresDisconnect(new Error('boom'))).toBe(false);
  });
});
