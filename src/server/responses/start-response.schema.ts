import { z } from 'zod';

/**
 * Forma canónica de un número de documento: sin espacios, puntos ni guiones y en
 * mayúsculas. «1.023.456.789» y «1023456789» son la misma cédula, y las letras de una cédula
 * de extranjería o un pasaporte no deben depender de cómo se escriban. La nómina se carga
 * en esta misma forma: es la llave con la que se compara.
 */
export function normalizeNumeroDocumento(value: string): string {
  return value.replace(/[\s.-]/g, '').toUpperCase();
}

const NUMERO_DOCUMENTO = /^[0-9A-Z]{4,20}$/;

export const startResponseSchema = z
  .object({
    numeroDocumento: z
      .string()
      .max(40)
      .transform(normalizeNumeroDocumento)
      .pipe(
        z.string().regex(NUMERO_DOCUMENTO, 'El número de documento no es válido.'),
      ),
  })
  .strict();

export type StartResponseInput = z.infer<typeof startResponseSchema>;
