import { clientIp, handler } from '@/server/http';
import { startResponse } from '@/server/responses/responses.service';

/** Abre un borrador. Limitado por IP para que no se pueda inundar la tabla. */
export const POST = handler(
  (request) =>
    startResponse({
      ip: clientIp(request),
      userAgent: request.headers.get('user-agent') ?? undefined,
    }),
  { status: 201, rateLimit: { limit: 10, windowMs: 60_000 } },
);
