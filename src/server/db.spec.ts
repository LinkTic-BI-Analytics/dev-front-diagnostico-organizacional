import { afterEach, describe, expect, it, vi } from 'vitest';
import { normalizeConnectionString } from './db';
import { migrationsDatabaseUrl } from './env';

const params = (url: string) => new URL(url).searchParams;

describe('normalizeConnectionString', () => {
  it('exige cifrado contra un host remoto que no declara sslmode', () => {
    const url = normalizeConnectionString(
      'postgresql://postgres.ref:clave@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true',
    );
    expect(params(url).get('sslmode')).toBe('require');
    expect(params(url).get('uselibpqcompat')).toBe('true');
    expect(params(url).get('pgbouncer')).toBe('true');
  });

  it('da semántica de libpq al sslmode=require de la integración de Vercel', () => {
    const url = normalizeConnectionString(
      'postgres://postgres.ref:clave@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require&supa=base-pooler.x&pgbouncer=true',
    );
    expect(params(url).get('sslmode')).toBe('require');
    expect(params(url).get('uselibpqcompat')).toBe('true');
  });

  it('no fuerza cifrado contra un Postgres local', () => {
    const url = normalizeConnectionString(
      'postgresql://postgres:postgres@localhost:5432/postgres',
    );
    expect(params(url).has('sslmode')).toBe(false);
  });

  it('respeta un sslmode declarado, también disable', () => {
    const url = normalizeConnectionString(
      'postgres://postgres:postgres@db.interna:51214/template1?sslmode=disable',
    );
    expect(params(url).get('sslmode')).toBe('disable');
  });

  it('conserva la contraseña codificada', () => {
    const url = normalizeConnectionString(
      'postgresql://postgres.ref:cl%21ve%23@host.supabase.com:6543/postgres',
    );
    expect(new URL(url).password).toBe('cl%21ve%23');
  });
});

describe('migrationsDatabaseUrl', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('apunta el CLI al esquema mod_encuestas', () => {
    vi.stubEnv('DIRECT_URL', 'postgresql://postgres.ref:cl%21ve@host.supabase.com:5432/postgres');
    const url = migrationsDatabaseUrl()!;
    expect(params(url).get('schema')).toBe('mod_encuestas');
    expect(new URL(url).password).toBe('cl%21ve');
  });

  it('también con la cadena de la integración de Vercel', () => {
    vi.stubEnv('DIRECT_URL', '');
    vi.stubEnv('POSTGRES_URL_NON_POOLING', 'postgres://postgres.ref:clave@host.supabase.com:5432/postgres?sslmode=require');
    expect(params(migrationsDatabaseUrl()!).get('schema')).toBe('mod_encuestas');
  });

  it('sigue sin exigir base de datos para `prisma generate`', () => {
    vi.stubEnv('DIRECT_URL', '');
    vi.stubEnv('POSTGRES_URL_NON_POOLING', '');
    expect(migrationsDatabaseUrl()).toBeUndefined();
  });
});
