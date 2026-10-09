/**
 * Configuración del servidor, leída del entorno.
 *
 * Cada valor se lee al usarse y no al importar el módulo: `next build` carga los route
 * handlers para recoger su configuración, y un `throw` a nivel de módulo tumbaría el build
 * en un entorno sin secretos (CI, un preview sin variables).
 *
 * Nada de aquí lleva el prefijo `NEXT_PUBLIC_`: son valores de servidor y nunca llegan al
 * bundle del navegador. La referencia completa está en `docs/VARIABLES-DE-ENTORNO.md`.
 */

/** Valor inicial del token del panel, tal como lo pidió LinkTIC para el arranque. */
export const DEFAULT_ADMIN_TOKEN = 'Admin123!@';

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Falta la variable de entorno ${name}. Vea docs/VARIABLES-DE-ENTORNO.md.`,
    );
  }
  return value;
}

function optional(name: string, fallback: string): string {
  return process.env[name] || fallback;
}

/** La primera variable definida de la lista; la de la izquierda manda. */
function firstOf(...names: string[]): string | undefined {
  for (const name of names) {
    if (process.env[name]) return process.env[name];
  }
  return undefined;
}

/**
 * Cadena de conexión del runtime: el pooler de Supabase en modo TRANSACCIÓN (6543), el que
 * soporta las muchas conexiones efímeras de las funciones de Vercel.
 *
 * `DATABASE_URL` manda si está declarada; si no, se usa la que inyecta la integración de
 * Supabase en Vercel (`POSTGRES_PRISMA_URL`, la misma cadena con `pgbouncer=true`). Así el
 * proyecto funciona con solo conectar la base desde el panel de Vercel, y una variable
 * explícita sigue pudiendo sobreescribirla.
 */
export function runtimeDatabaseUrl(): string {
  const url = firstOf('DATABASE_URL', 'POSTGRES_PRISMA_URL');
  if (!url) {
    throw new Error(
      'Falta la cadena de conexión: declare DATABASE_URL o conecte la base de Supabase ' +
        'al proyecto en Vercel (inyecta POSTGRES_PRISMA_URL). Vea docs/VARIABLES-DE-ENTORNO.md.',
    );
  }
  return url;
}

/**
 * Cadena del CLI de Prisma (`migrate`, `db seed`): el pooler en modo SESIÓN (5432).
 * `migrate` toma locks de sesión que el modo transacción no conserva entre sentencias:
 * apuntada al 6543, la migración se queda colgada sin mensaje de error.
 */
export function migrationsDatabaseUrl(): string | undefined {
  return firstOf('DIRECT_URL', 'POSTGRES_URL_NON_POOLING');
}

export const serverEnv = {
  get isDeployed(): boolean {
    // `VERCEL` además de NODE_ENV: cualquier despliegue sirve solo por HTTPS, y basta con
    // que alguien deje NODE_ENV=development entre las variables del proyecto para que la
    // cookie de sesión del admin salga sin `Secure`. La bandera no debe depender de una
    // variable que se copia a mano.
    return process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
  },

  get adminAccessToken(): string {
    return required('ADMIN_ACCESS_TOKEN');
  },

  get jwtSecret(): string {
    return required('JWT_SECRET');
  },

  /** Vigencia de la sesión, en el formato de `ms` y de `jose`: 15m, 8h, 7d. */
  get jwtExpiresIn(): string {
    return optional('JWT_EXPIRES_IN', '8h');
  },

  get cookieName(): string {
    return optional('COOKIE_NAME', 'linktic_admin_session');
  },

  get hashSalt(): string {
    return required('HASH_SALT');
  },

  /** Mínimo de respuestas para publicar un corte: la garantía de anonimato. */
  get minCohortSize(): number {
    return Number(optional('MIN_COHORT_SIZE', '4'));
  },

  get loginRateLimit(): number {
    return Number(optional('LOGIN_RATE_LIMIT', '5'));
  },

  get loginRateWindowMinutes(): number {
    return Number(optional('LOGIN_RATE_WINDOW_MINUTES', '15'));
  },
};
