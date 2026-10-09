import { beforeEach, describe, expect, it, vi } from 'vitest';
import { login } from './auth.service';
import { countRecentAudits, recordAudit } from './audit';
import { secretsMatch } from '../common/utils/hash.util';
import { HttpError } from '../http';
import { sessionCookieOptions, verifySession } from '../session';

vi.mock('./audit', () => ({
  recordAudit: vi.fn().mockResolvedValue(undefined),
  countRecentAudits: vi.fn().mockResolvedValue(0),
}));

const ENV: Record<string, string> = {
  ADMIN_ACCESS_TOKEN: 'Admin123!@',
  JWT_SECRET: 'x'.repeat(64),
  JWT_EXPIRES_IN: '8h',
  HASH_SALT: 'sal-de-prueba',
  LOGIN_RATE_LIMIT: '5',
  LOGIN_RATE_WINDOW_MINUTES: '15',
};

beforeEach(() => {
  vi.unstubAllEnvs();
  for (const [key, value] of Object.entries(ENV)) vi.stubEnv(key, value);
  vi.stubEnv('VERCEL', '');
  vi.mocked(recordAudit).mockClear();
  vi.mocked(countRecentAudits).mockResolvedValue(0);
});

function statusOf(promise: Promise<unknown>) {
  return promise.then(
    () => null,
    (error: unknown) => (error instanceof HttpError ? error.status : error),
  );
}

describe('login', () => {
  it('acepta el token correcto y firma un JWT que la sesión reconoce', async () => {
    const { token, expiresIn } = await login('Admin123!@', '10.0.0.1');

    expect(expiresIn).toBe('8h');
    await expect(verifySession(token)).resolves.toEqual({
      sub: 'admin',
      role: 'admin',
    });
    expect(recordAudit).toHaveBeenCalledWith('LOGIN_OK', expect.any(String));
  });

  it('rechaza un token incorrecto de la misma longitud', async () => {
    expect(await statusOf(login('Admin123!X', '10.0.0.1'))).toBe(401);
    expect(recordAudit).toHaveBeenCalledWith('LOGIN_FAIL', expect.any(String));
  });

  it('rechaza un token de longitud distinta sin lanzar por tamaño de buffer', async () => {
    expect(await statusOf(login('a', '10.0.0.1'))).toBe(401);
    expect(await statusOf(login('x'.repeat(500), '10.0.0.1'))).toBe(401);
  });

  it('rechaza un token vacío', async () => {
    expect(await statusOf(login('', '10.0.0.1'))).toBe(401);
  });

  it('bloquea con 429 tras alcanzar el límite de intentos fallidos', async () => {
    vi.mocked(countRecentAudits).mockResolvedValue(5);
    expect(await statusOf(login('Admin123!@', '10.0.0.1'))).toBe(429);
  });

  it('no aplica rate limit cuando no hay IP que atribuir', async () => {
    vi.mocked(countRecentAudits).mockResolvedValue(99);
    await expect(login('Admin123!@', undefined)).resolves.toMatchObject({
      expiresIn: '8h',
    });
  });
});

describe('verifySession', () => {
  it('rechaza un JWT firmado con otro secreto', async () => {
    const { token } = await login('Admin123!@', '10.0.0.1');
    vi.stubEnv('JWT_SECRET', 'y'.repeat(64));
    await expect(verifySession(token)).resolves.toBeNull();
  });

  it('rechaza un token que no es un JWT', async () => {
    await expect(verifySession('no-es-un-jwt')).resolves.toBeNull();
    await expect(verifySession(undefined)).resolves.toBeNull();
  });
});

describe('sessionCookieOptions', () => {
  it('marca la cookie httpOnly para que JavaScript no la pueda leer', () => {
    expect(sessionCookieOptions()).toMatchObject({
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
    });
  });

  it('no exige Secure fuera de producción, para poder probar por HTTP', () => {
    expect(sessionCookieOptions().secure).toBe(false);
  });

  it('exige Secure en Vercel aunque NODE_ENV diga otra cosa', () => {
    vi.stubEnv('VERCEL', '1');
    expect(sessionCookieOptions().secure).toBe(true);
  });
});

describe('secretsMatch', () => {
  it('compara por igualdad exacta', () => {
    expect(secretsMatch('Admin123!@', 'Admin123!@')).toBe(true);
    expect(secretsMatch('Admin123!@', 'admin123!@')).toBe(false);
  });

  it('tolera longitudes distintas sin lanzar, porque hashea antes de comparar', () => {
    expect(() => secretsMatch('a', 'x'.repeat(1000))).not.toThrow();
    expect(secretsMatch('a', 'x'.repeat(1000))).toBe(false);
  });
});
