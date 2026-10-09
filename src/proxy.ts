import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { readSession } from '@/server/session';

/**
 * Chequeo de sesión sobre /admin/*: sin una sesión válida, a /login.
 *
 * Valida la firma y la vigencia del JWT, no solo que la cookie exista: el servidor y las
 * pantallas son el mismo proyecto y comparten JWT_SECRET, así que una sesión vencida va al
 * login en vez de pintar un panel vacío que luego recibe 401.
 *
 * Sigue sin ser la autorización: la autoridad son los route handlers de /api/v1/admin, que
 * validan la sesión en cada llamada. La documentación de Next lo plantea así: el proxy es
 * un atajo para el caso feliz, no una barrera.
 */
export async function proxy(request: NextRequest) {
  if (await readSession(request)) return NextResponse.next();

  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('next', request.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = { matcher: '/admin/:path*' };
