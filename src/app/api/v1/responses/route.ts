import { clientIp, handler, parseBody } from '@/server/http';
import { startResponse } from '@/server/responses/responses.service';
import { startResponseSchema } from '@/server/responses/start-response.schema';

/**
 * Abre un borrador. Limitado por IP para que no se pueda inundar la tabla, ni recorrer la
 * nómina probando números de documento.
 */
export const POST = handler(
  async (request) =>
    startResponse(await parseBody(request, startResponseSchema), {
      ip: clientIp(request),
      userAgent: request.headers.get('user-agent') ?? undefined,
    }),
  { status: 201, rateLimit: { limit: 10, windowMs: 60_000 } },
);
