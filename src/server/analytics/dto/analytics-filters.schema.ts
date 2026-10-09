import { z } from 'zod';
import { RESPONDENT_ROLE_VALUES } from '../../common/constants';
import type { AnalyticsFilters } from './analytics.dto';

const FRECUENCIAS = [
  'DIARIA',
  'VARIAS_SEMANA',
  'SEMANAL',
  'MENSUAL',
  'ESPORADICA',
] as const;
const TIPOS = [
  'OPERATIVA',
  'TACTICA',
  'ESTRATEGICA',
  'COMERCIAL',
  'SOPORTE',
] as const;

const ISO_8601 =
  /^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?$/;

/** Fecha ISO 8601: `2026-10-08` o con hora y zona, como la manda el panel. */
export const isoDateString = z
  .string()
  .refine((value) => ISO_8601.test(value) && !Number.isNaN(Date.parse(value)), {
    message: 'Debe ser una fecha ISO 8601.',
  });

const role = z
  .string()
  .refine((value) => RESPONDENT_ROLE_VALUES.includes(value), {
    message: 'El cargo no está entre los niveles del instrumento.',
  });

/**
 * Filtros globales del dashboard (Contexto.md §4.5). `.strict()` rechaza parámetros
 * desconocidos con un 400, como el ValidationPipe con `forbidNonWhitelisted`.
 */
const filtersShape = {
  campaignId: z.uuid().optional(),
  ownArea: z.string().max(64).optional(),
  respondentRole: role.optional(),
  frecuencia: z.enum(FRECUENCIAS).optional(),
  tipoInteraccion: z.enum(TIPOS).optional(),
  from: isoDateString.optional(),
  to: isoDateString.optional(),
};

export const analyticsFiltersSchema: z.ZodType<AnalyticsFilters> = z
  .object(filtersShape)
  .strict();

/** El listado de respuestas suma la paginación; llega como texto en la query. */
export const paginatedFiltersSchema = z
  .object({
    ...filtersShape,
    page: z.coerce.number().int().min(1).optional(),
    pageSize: z.coerce.number().int().min(1).max(200).optional(),
  })
  .strict();

export const updateThemeSchema = z
  .object({ theme: z.string().max(120).nullish() })
  .strict();

/**
 * Pesos del IMC. Antes el cuerpo no se validaba (era un tipo en línea, que el ValidationPipe
 * no ve) y un cuerpo sin `weights` terminaba en un 500. La suma y los códigos los valida
 * `updateWeights`, que es quien conoce el IMC.
 */
export const updateWeightsSchema = z
  .object({
    weights: z
      .array(
        z
          .object({
            indicatorCode: z.string().max(16),
            weight: z.number().min(0).max(1),
          })
          .strict(),
      )
      .min(1)
      .max(16),
  })
  .strict();
