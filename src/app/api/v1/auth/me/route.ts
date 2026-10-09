import { handler } from '@/server/http';

/** El panel lo usa para saber si la sesión sigue viva antes de pintarse. */
export const GET = handler(
  async () => ({ authenticated: true, role: 'admin' as const }),
  { admin: true },
);
