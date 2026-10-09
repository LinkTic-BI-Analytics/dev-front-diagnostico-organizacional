import { describe, expect, it } from 'vitest';
import { normalizeConnectionString } from './db';

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
