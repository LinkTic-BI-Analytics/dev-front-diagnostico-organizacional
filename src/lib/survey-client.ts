import { apiFetch } from './api';
import {
  GLOBAL_AREA_CODE,
  type AnswerPayload,
  type AnswerValue,
  type DraftResult,
  type Identity,
  type Question,
  type StartResponseResult,
  type StoredAnswer,
  type SurveySchema,
} from './survey-schema.types';

export const getSchema = () => apiFetch<SurveySchema>('/survey/schema');

export const startResponse = () =>
  apiFetch<StartResponseResult>('/responses', { method: 'POST' });

export const getDraft = (draftToken: string) =>
  apiFetch<DraftResult>(`/responses/${draftToken}`);

export const saveStep = (
  draftToken: string,
  componentId: number,
  answers: AnswerPayload[],
  identity?: Partial<Identity>,
) =>
  apiFetch<{ saved: number; componentId: number }>(
    `/responses/${draftToken}/step/${componentId}`,
    { method: 'PATCH', body: { answers, ...identity } },
  );

export const submitSurvey = (draftToken: string) =>
  apiFetch<{ status: 'COMPLETED'; submittedAt: string; alreadySubmitted: boolean }>(
    `/responses/${draftToken}/submit`,
    { method: 'POST' },
  );

/**
 * Conversión entre la forma que usa el formulario y la que espera la API.
 *
 * Vive en un solo lugar porque un desajuste aquí se manifiesta como respuestas que
 * "se pierden" al guardar, que es de los bugs más caros de rastrear.
 */
export function toPayload(
  question: Question,
  value: AnswerValue | undefined,
  targetArea = GLOBAL_AREA_CODE,
): AnswerPayload {
  const base: AnswerPayload = { questionCode: question.code, targetArea };
  if (!value) return base;

  switch (value.kind) {
    case 'number':
      return { ...base, valueNumber: value.value };
    case 'option':
      return { ...base, valueOption: value.value, valueText: value.otherText ?? null };
    case 'options':
      return { ...base, valueOptions: value.values, valueText: value.otherText ?? null };
    case 'text':
      return { ...base, valueText: value.value };
  }
}

/**
 * Reconstruye el valor del formulario a partir de lo que devolvió el borrador.
 *
 * Las opciones que ya no están en el catálogo se descartan: un borrador guardado antes de
 * cambiar una pregunta traería un valor que ningún botón muestra marcado, el paso lo daría
 * por respondido y el envío lo rechazaría al final. Descartado, la pregunta vuelve a
 * pedirse donde corresponde.
 */
export function fromStored(question: Question, stored: StoredAnswer): AnswerValue | undefined {
  const isOffered = (value: string) => question.options.some((option) => option.value === value);

  switch (question.type) {
    case 'SCALE_0_10':
    case 'MATRIX_AREA':
      return stored.valueNumber === null ? undefined : { kind: 'number', value: stored.valueNumber };
    case 'SINGLE':
      return stored.valueOption === null || !isOffered(stored.valueOption)
        ? undefined
        : {
            kind: 'option',
            value: stored.valueOption,
            otherText: stored.valueText ?? undefined,
          };
    case 'MULTI': {
      const values = stored.valueOptions.filter(isOffered);
      return values.length === 0
        ? undefined
        : {
            kind: 'options',
            values,
            otherText: stored.valueText ?? undefined,
          };
    }
    case 'TEXT':
      return stored.valueText === null ? undefined : { kind: 'text', value: stored.valueText };
  }
}
