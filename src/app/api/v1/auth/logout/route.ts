import { NextResponse } from 'next/server';
import { logout } from '@/server/auth/auth.service';
import { serverEnv } from '@/server/env';
import { clientIp, handler } from '@/server/http';
import { sessionCookieOptions } from '@/server/session';

export const POST = handler(async (request) => {
  await logout(clientIp(request));

  const response = NextResponse.json({ authenticated: false });
  response.cookies.set(serverEnv.cookieName, '', {
    ...sessionCookieOptions(),
    maxAge: 0,
  });
  return response;
});
