import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { readSession } from './session';

/**
 * Capa HTTP de los route handlers de `/api/v1`.
 *
 * Reemplaza lo que en el backend de NestJS hacían el filtro de excepciones, el
 * ValidationPipe, el ThrottlerGuard y el AdminGuard, y conserva sus formas de respuesta:
 * el front distingue los errores por estado y lee `message`, `violations`, `missing` y
 * `retryAfterSeconds` del cuerpo, así que esas formas son contrato.
 */

const REASON_PHRASES: Record<number, string> = {
  400: 'Bad Request',
  401: 'Unauthorized',
  404: 'Not Found',
  409: 'Conflict',
  422: 'Unprocessable Entity',
  429: 'Too Many Requests',
};

/**
 * Error con estado HTTP. Con un texto, el cuerpo es `{ statusCode, message, error }`; con un
 * objeto, el objeto tal cual. Es la misma convención de las excepciones de NestJS, de la que
 * dependen las pantallas.
 */
export class HttpError extends Error {
  readonly body: Record<string, unknown>;

  constructor(
    readonly status: number,
    body: string | Record<string, unknown>,
  ) {
    super(typeof body === 'string' ? body : String(body.message ?? status));
    this.name = 'HttpError';
    this.body =
      typeof body === 'string'
        ? { statusCode: status, message: body, error: REASON_PHRASES[status] }
        : body;
  }
}

export function errorResponse(error: unknown): Response {
  if (error instanceof HttpError) {
    return Response.json(error.body, { status: error.status });
  }

  // P2025 es el `update` de Prisma sobre una fila que no existe (p. ej. el tema de una
  // respuesta abierta que ya se borró): es un 404, no una falla del servidor.
  if ((error as { code?: unknown } | null)?.code === 'P2025') {
    return errorResponse(new HttpError(404, 'El registro no existe.'));
  }

  // Nunca se filtra el detalle al cliente: puede llevar SQL, rutas o datos de la base.
  console.error('Error no controlado', error);
  return Response.json(
    {
      statusCode: 500,
      message: 'Ocurrió un error inesperado. Intente de nuevo.',
    },
    { status: 500 },
  );
}

// ---------- validación ----------

const spanish = z.locales.es().localeError;

function validate<T>(schema: z.ZodType<T>, raw: unknown): T {
  // El locale va por llamada y no con `z.config`, que es global: cambiaría también los
  // mensajes del formulario de la encuesta, que tiene los suyos.
  const result = schema.safeParse(raw, { error: spanish });
  if (result.success) return result.data;

  const message = result.error.issues
    .map((issue) =>
      issue.path.length > 0
        ? `${issue.path.join('.')}: ${issue.message}`
        : issue.message,
    )
    .join('; ');
  throw new HttpError(400, message);
}

export async function parseBody<T>(
  request: Request,
  schema: z.ZodType<T>,
): Promise<T> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    throw new HttpError(400, 'El cuerpo de la solicitud no es JSON válido.');
  }
  return validate(schema, raw);
}

export function parseQuery<T>(request: NextRequest, schema: z.ZodType<T>): T {
  return validate(schema, Object.fromEntries(request.nextUrl.searchParams));
}

export function parseParams<T>(params: unknown, schema: z.ZodType<T>): T {
  return validate(schema, params);
}

// ---------- cliente ----------

/**
 * IP del cliente. En Vercel la fija su borde en `x-real-ip` y en el primer valor de
 * `x-forwarded-for`, sobrescribiendo lo que mande el navegador. Fuera de Vercel esas
 * cabeceras las puede escribir cualquiera; solo alimentan el rate limit y el hash de la
 * auditoría, nunca una decisión de acceso.
 */
export function clientIp(request: Request): string | undefined {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0];
  return request.headers.get('x-real-ip') ?? (forwarded?.trim() || undefined);
}

// ---------- límite de frecuencia ----------

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

/**
 * Límite de ráfagas por IP, en memoria de la instancia, como el ThrottlerGuard que
 * reemplaza. Corta ráfagas rápidas contra una misma instancia; no es una garantía entre
 * instancias. Lo que sí sobrevive a los arranques en frío es el límite de login, que se
 * respalda en `admin_audit_log`. Para un tope global de verdad está el firewall de Vercel.
 */
export function rateLimit(key: string, limit: number, windowMs: number): void {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    if (buckets.size > 10_000) {
      for (const [stale, entry] of buckets) {
        if (entry.resetAt <= now) buckets.delete(stale);
      }
    }
    return;
  }

  bucket.count += 1;
  if (bucket.count > limit) {
    throw new HttpError(429, {
      statusCode: 429,
      message: 'Demasiadas solicitudes. Espere un momento e intente de nuevo.',
      retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000),
    });
  }
}

// ---------- route handlers ----------

interface HandlerOptions {
  /** Exige sesión de admin. Es la autoridad real: el proxy de /admin es solo un atajo. */
  admin?: boolean;
  /** Estado de éxito. Los POST que crean algo responden 201, como lo hacía NestJS. */
  status?: number;
  /** Tope de solicitudes por IP y por ruta. Por defecto, 120 por minuto. */
  rateLimit?: { limit: number; windowMs: number };
}

const DEFAULT_RATE_LIMIT = { limit: 120, windowMs: 60_000 };

/**
 * Envuelve un route handler: límite de frecuencia, sesión de admin, serialización a JSON y
 * traducción de errores. El cuerpo del handler solo devuelve datos o lanza `HttpError`.
 */
export function handler<C extends { params: Promise<unknown> }>(
  fn: (request: NextRequest, context: C) => Promise<unknown>,
  options: HandlerOptions = {},
) {
  return async (request: NextRequest, context: C): Promise<Response> => {
    try {
      const { limit, windowMs } = options.rateLimit ?? DEFAULT_RATE_LIMIT;
      rateLimit(
        `${request.method} ${request.nextUrl.pathname} ${clientIp(request) ?? 'local'}`,
        limit,
        windowMs,
      );

      if (options.admin && !(await readSession(request))) {
        throw new HttpError(401, { statusCode: 401, message: 'Unauthorized' });
      }

      const result = await fn(request, context);
      if (result instanceof Response) return result;
      return Response.json(result, { status: options.status ?? 200 });
    } catch (error) {
      return errorResponse(error);
    }
  };
}
