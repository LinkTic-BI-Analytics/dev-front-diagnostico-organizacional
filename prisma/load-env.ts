/**
 * Carga el entorno como lo hace Next: `.env.local` (el que escribe `vercel env pull`),
 * `.env.development`, `.env`… en ese orden de precedencia. Los scripts de Prisma corren
 * fuera de Next y sin esto solo verían las variables ya exportadas en la terminal.
 *
 * Se importa primero, por su efecto: el resto de los módulos leen el entorno al usarse.
 */
import { loadEnvConfig } from '@next/env';

loadEnvConfig(process.cwd());
