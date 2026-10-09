import { z } from 'zod';
import type { AnswerValue, Question } from './survey-schema.types';

const OTHER_TEXT_MAX = 200;

export interface FieldError {
  field: string;
  message: string;
}

/**
 * Valida una respuesta contra las reglas que el catálogo declara.
 *
 * Se genera desde el schema del servidor en vez de escribir 13 validaciones a mano: esas
 * se desincronizarían del backend en cuanto el instrumento cambiara, y el usuario vería
 * un 422 del servidor sobre un formulario que el cliente dio por válido.
 *
 * Es un espejo deliberado del motor de reglas del backend, no un reemplazo: el servidor
 * revalida siempre, porque no se confía en el cliente.
 */
export function validateAnswer(
  question: Question,
  value: AnswerValue | undefined,
): string | null {
  const isEmpty =
    value === undefined ||
    (value.kind === 'options' && value.values.length === 0) ||
    (value.kind === 'text' && value.value.trim().length === 0);

  if (isEmpty) {
    return question.required ? 'Esta pregunta es obligatoria.' : null;
  }

  switch (value.kind) {
    case 'number':
      return validateScale(value.value);
    case 'option':
      return validateSingle(question, value);
    case 'options':
      return validateMulti(question, value);
    case 'text':
      return validateText(question, value.value);
  }
}

function validateScale(value: number): string | null {
  if (!Number.isInteger(value) || value < 0 || value > 10) {
    return 'Seleccione un valor entre 0 y 10.';
  }
  return null;
}

function validateSingle(
  question: Question,
  value: Extract<AnswerValue, { kind: 'option' }>,
): string | null {
  const option = question.options.find((entry) => entry.value === value.value);
  if (!option) return 'Seleccione una opción válida.';
  if (option.allowsText) return validateOtherText(value.otherText);
  return null;
}

function validateMulti(
  question: Question,
  value: Extract<AnswerValue, { kind: 'options' }>,
): string | null {
  const { values } = value;

  const unknown = values.filter(
    (entry) => !question.options.some((option) => option.value === entry),
  );
  if (unknown.length > 0) return 'Hay opciones no válidas seleccionadas.';

  if (question.minSelect != null && values.length < question.minSelect) {
    return question.minSelect === 1
      ? 'Seleccione al menos una opción.'
      : `Seleccione al menos ${question.minSelect} opciones.`;
  }

  if (question.maxSelect != null && values.length > question.maxSelect) {
    return `Seleccione máximo ${question.maxSelect} opciones.`;
  }

  const exclusive = question.options.filter((option) => option.exclusive);
  const chosenExclusive = exclusive.filter((option) => values.includes(option.value));
  if (chosenExclusive.length > 0 && values.length > 1) {
    return `"${chosenExclusive[0].label}" no se puede combinar con otras opciones.`;
  }

  const needsText = question.options.some(
    (option) => option.allowsText && values.includes(option.value),
  );
  return needsText ? validateOtherText(value.otherText) : null;
}

function validateText(question: Question, text: string): string | null {
  const max = question.maxLength ?? 1000;
  return text.length > max ? `El texto no puede exceder ${max} caracteres.` : null;
}

function validateOtherText(text: string | undefined): string | null {
  const trimmed = text?.trim() ?? '';
  if (trimmed.length === 0) return 'Indique cuál al elegir esta opción.';
  if (trimmed.length > OTHER_TEXT_MAX) {
    return `El texto no puede exceder ${OTHER_TEXT_MAX} caracteres.`;
  }
  return null;
}

/** Valida todas las respuestas de un paso. Devuelve los errores por clave de campo. */
export function validateStep(
  entries: { question: Question; targetArea: string; value: AnswerValue | undefined }[],
): Record<string, string> {
  const errors: Record<string, string> = {};

  for (const entry of entries) {
    const message = validateAnswer(entry.question, entry.value);
    if (message) errors[`${entry.question.code}__${entry.targetArea}`] = message;
  }

  return errors;
}

/**
 * Schema Zod de la identificación. Área y cargo son obligatorios: sin área no hay fila
 * en el mapa de relacionamiento y sin cargo no hay corte por nivel. La encuesta sigue
 * siendo anónima — no se pide el nombre.
 */
export function buildIdentitySchema(areaCodes: string[], roleValues: string[]) {
  return z.object({
    ownArea: z
      .string()
      .refine((code) => areaCodes.includes(code), 'Indique a qué área pertenece.'),
    respondentRole: z
      .string()
      .refine((role) => roleValues.includes(role), 'Indique su cargo.'),
  });
}

/** Errores por campo de la identificación, en la forma que usa el paso de bienvenida. */
export function validateIdentity(
  identity: { ownArea: string; respondentRole: string },
  areaCodes: string[],
  roleValues: string[],
): Record<string, string> {
  const result = buildIdentitySchema(areaCodes, roleValues).safeParse(identity);
  if (result.success) return {};

  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const field = String(issue.path[0]);
    errors[field] ??= issue.message;
  }
  return errors;
}
