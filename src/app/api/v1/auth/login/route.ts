import { NextResponse } from 'next/server';
import { z } from 'zod';
import { login } from '@/server/auth/auth.service';
import { serverEnv } from '@/server/env';
import { clientIp, handler, parseBody } from '@/server/http';
import { sessionCookieOptions } from '@/server/session';

const loginSchema = z.object({ token: z.string().min(1).max(256) }).strict();

/**
 * Cambia el token por una cookie de sesión.
 *
 * Doble límite a propósito: el de ráfagas corta intentos rápidos contra una instancia, y el
 * de `login` (respaldado en la auditoría) corta la fuerza bruta sostenida entre instancias.
 */
export const POST = handler(
  async (request) => {
    const { token } = await parseBody(request, loginSchema);
    const session = await login(token, clientIp(request));

    const response = NextResponse.json({
      authenticated: true,
      expiresIn: session.expiresIn,
    });
    response.cookies.set(
      serverEnv.cookieName,
      session.token,
      sessionCookieOptions(),
    );
    return response;
  },
  { rateLimit: { limit: 10, windowMs: 60_000 } },
);
