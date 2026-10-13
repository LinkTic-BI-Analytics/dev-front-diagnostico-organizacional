import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './generated/prisma/client';
import { DATABASE_SCHEMA, runtimeDatabaseUrl } from './env';

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

/**
 * Ajusta la cadena de conexión para que viaje cifrada y conecte contra Supabase.
 *
 * 1. **Sin `sslmode`, node-postgres conecta en claro**, y las credenciales y las respuestas
 *    de la encuesta cruzarían internet sin cifrar entre Vercel y Supabase. Fuera de la
 *    máquina local se exige `sslmode=require`; una cadena que declare su propio `sslmode`
 *    (p. ej. `disable` para un Postgres de pruebas) se respeta.
 * 2. **node-postgres 8.x interpreta `require` como `verify-full`**: valida el certificado
 *    contra las CA del sistema, la de Supabase no está entre ellas, y la conexión cae con
 *    «self-signed certificate in certificate chain». Pasa también con las cadenas que
 *    inyecta la integración de Supabase en Vercel. Se le pide a pg la semántica de libpq:
 *    cifrar sin verificar la CA, que es lo que `require` significa en cualquier otro
 *    cliente de Postgres.
 */
export function normalizeConnectionString(url: string): string {
  const parsed = new URL(url);
  const params = parsed.searchParams;
  if (!params.has('sslmode') && !LOCAL_HOSTS.has(parsed.hostname)) {
    params.set('sslmode', 'require');
  }
  if (params.has('sslmode') && !params.has('uselibpqcompat')) {
    params.set('uselibpqcompat', 'true');
  }
  return parsed.toString();
}

export function createPrismaClient(url = runtimeDatabaseUrl()): PrismaClient {
  return new PrismaClient({
    adapter: new PrismaPg(
      { connectionString: normalizeConnectionString(url) },
      { schema: DATABASE_SCHEMA },
    ),
  });
}

/**
 * Una sola instancia por proceso. En Vercel cada instancia de la función la reutiliza entre
 * invocaciones; en `next dev` se guarda en `globalThis` porque la recarga en caliente
 * re-evalúa los módulos, y cada evaluación abriría un pool nuevo contra el pooler.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/**
 * El cliente se crea en la primera consulta, no al importar: así `next build` puede cargar
 * los route handlers sin una base de datos a mano.
 */
export function db(): PrismaClient {
  globalForPrisma.prisma ??= createPrismaClient();
  return globalForPrisma.prisma;
}
