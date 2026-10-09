/**
 * Cliente HTTP hacia la API del propio proyecto: los route handlers de `src/app/api/v1`.
 *
 * `credentials: 'include'` en todo: la sesión del admin viaja en una cookie httpOnly que
 * el navegador debe enviar. El navegador nunca habla directo con Supabase — toda la
 * validación y la regla de anonimato viven en el servidor y no deben poder eludirse.
 */

/**
 * Ruta base RELATIVA al propio origen. Las pantallas y la API comparten dominio, así que
 * la cookie de sesión es first-party sin rewrites ni CORS.
 */
const BASE_URL = '/api/v1';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly body?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /** La sesión expiró o nunca existió: el llamador debe mandar a /login. */
  get isUnauthorized(): boolean {
    return this.status === 401;
  }

  /** Violaciones de las reglas del instrumento, con detalle por pregunta. */
  get isValidationError(): boolean {
    return this.status === 422;
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  signal?: AbortSignal;
  /** Query params; los `undefined` se omiten. */
  query?: Record<string, string | number | undefined>;
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  // `URLSearchParams` y no `new URL`: la base es relativa y `new URL` exige una absoluta.
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(options.query ?? {})) {
    if (value !== undefined) params.set(key, String(value));
  }
  const query = params.toString();
  const url = `${BASE_URL}${path}${query ? `?${query}` : ''}`;

  const response = await fetch(url, {
    method: options.method ?? 'GET',
    credentials: 'include',
    headers: options.body ? { 'Content-Type': 'application/json' } : undefined,
    body: options.body ? JSON.stringify(options.body) : undefined,
    signal: options.signal,
    // Datos de encuesta y de panel: nunca se cachean.
    cache: 'no-store',
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const message =
      (body as { message?: string } | null)?.message ??
      `La solicitud falló con estado ${response.status}`;
    throw new ApiError(response.status, message, body);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}
