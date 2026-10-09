import { jwtVerify, SignJWT } from 'jose';
import type { NextRequest } from 'next/server';
import { serverEnv } from './env';

/**
 * Sesión del panel: un JWT HS256 en una cookie httpOnly.
 *
 * Lo importan los route handlers y también `proxy.ts`, así que no depende de Prisma ni de
 * nada que no pueda cargarse en el proxy. Ahora que el servidor y las pantallas son el mismo
 * proyecto, el proxy valida la firma con el mismo secreto en vez de solo mirar si la cookie
 * existe.
 *
 * El formato es el que emitía el backend de NestJS (`sub` y `role` en `admin`, `iat`,
 * `exp`), así que con el mismo JWT_SECRET una sesión abierta antes del cambio sigue
 * siendo válida después.
 */

export interface AdminSession {
  sub: 'admin';
  role: 'admin';
}

function signingKey(): Uint8Array {
  return new TextEncoder().encode(serverEnv.jwtSecret);
}

export async function signSession(): Promise<string> {
  return new SignJWT({ role: 'admin' })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject('admin')
    .setIssuedAt()
    .setExpirationTime(serverEnv.jwtExpiresIn)
    .sign(signingKey());
}

/** `null` si no hay token, si la firma no cuadra o si expiró. Nunca lanza. */
export async function verifySession(
  token: string | undefined,
): Promise<AdminSession | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, signingKey(), {
      algorithms: ['HS256'],
    });
    return payload.sub === 'admin' && payload.role === 'admin'
      ? { sub: 'admin', role: 'admin' }
      : null;
  } catch {
    return null;
  }
}

/** Lee la sesión de la cookie. Nunca del header ni de la URL. */
export function readSession(request: NextRequest): Promise<AdminSession | null> {
  return verifySession(request.cookies.get(serverEnv.cookieName)?.value);
}

/**
 * Opciones de la cookie. `httpOnly` para que JavaScript no la lea; `lax` porque la API y
 * las pantallas comparten origen, así que la cookie es siempre first-party y `lax` la
 * protege de CSRF sin estorbar. Sin `domain`: queda atada al host que la emitió.
 */
export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: serverEnv.isDeployed,
    sameSite: 'lax' as const,
    path: '/',
  };
}
