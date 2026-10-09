import { z } from 'zod';
import {
  RESPONDENT_ROLE_VALUES,
  SCALE_MAX,
  SCALE_MIN,
} from '../common/constants';

/**
 * Forma de una respuesta entrante. Valida solo tipos y tamaños: lo que el instrumento exige
 * (opciones válidas, rangos por pregunta, reglas cruzadas) lo resuelve el motor de `rules/`
 * contra el catálogo.
 *
 * `.strict()` rechaza propiedades desconocidas, como hacía el ValidationPipe con
 * `forbidNonWhitelisted`, y los valores aceptan `null` porque el wizard los manda así.
 */
const answerInputSchema = z
  .object({
    questionCode: z.string().max(64),
    targetArea: z.string().max(64).nullish(),
    valueNumber: z.number().int().min(SCALE_MIN).max(SCALE_MAX).nullish(),
    valueOption: z.string().max(64).nullish(),
    valueOptions: z.array(z.string().max(64)).max(32).nullish(),
    valueText: z.string().max(2000).nullish(),
  })
  .strict();

export const saveStepSchema = z
  .object({
    answers: z.array(answerInputSchema).max(64),
    /** Área propia, capturada en la identificación antes de empezar la encuesta. */
    ownArea: z.string().max(64).optional(),
    respondentRole: z
      .string()
      .refine((role) => RESPONDENT_ROLE_VALUES.includes(role), {
        message: 'El cargo no está entre los niveles del instrumento.',
      })
      .optional(),
  })
  .strict();

export type SaveStepInput = z.infer<typeof saveStepSchema>;
