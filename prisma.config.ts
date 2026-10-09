import './prisma/load-env';
import type { PrismaConfig } from 'prisma';
import { migrationsDatabaseUrl } from './src/server/env';

export default {
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    // El CLI usa la conexión en modo SESIÓN (DIRECT_URL, o POSTGRES_URL_NON_POOLING de la
    // integración de Supabase en Vercel): `migrate` toma locks que el pooler en modo
    // transacción no conserva entre sentencias, y la migración se queda colgada. El runtime
    // de la app no pasa por aquí: usa el pooler en `src/server/db.ts`.
    //
    // Puede faltar: `prisma generate` —que corre en cada `npm install` y en el build de
    // Vercel— no necesita base de datos, y no debe exigir una.
    url: migrationsDatabaseUrl() ?? '',
  },
} satisfies PrismaConfig;
