/**
 * Espejo de los DTOs del servidor (`src/server/survey/dto/survey-schema.dto.ts`). Es el
 * contrato del wizard schema-driven: el front no
 * conoce las 53 preguntas del instrumento, las recibe de `GET /survey/schema`.
 */

export type QuestionType = 'SINGLE' | 'MULTI' | 'SCALE_0_10' | 'TEXT' | 'MATRIX_AREA';

export interface Area {
  code: string;
  name: string;
  isEvaluable: boolean;
  /** Gestión a la que pertenece el subproceso. */
  procesoCode: string | null;
}

export interface Proceso {
  code: string;
  name: string;
}

export interface RespondentRole {
  value: string;
  label: string;
}

export interface QuestionOption {
  value: string;
  label: string;
  allowsText: boolean;
  exclusive: boolean;
  /** Gestión bajo la que se agrupa la opción. `null` = opción suelta. */
  group: { code: string; label: string } | null;
}

export interface Question {
  code: string;
  componentId: number;
  label: string;
  helpText: string | null;
  /** Qué significa el 0 en una escala. `null` fuera de SCALE_0_10 y MATRIX_AREA. */
  scaleMinLabel: string | null;
  /** Qué significa el 10 en una escala. `null` fuera de SCALE_0_10 y MATRIX_AREA. */
  scaleMaxLabel: string | null;
  type: QuestionType;
  required: boolean;
  minSelect: number | null;
  maxSelect: number | null;
  /** Cuando es true, la pregunta se repite por cada área evaluada. */
  perArea: boolean;
  maxLength: number | null;
  options: QuestionOption[];
}

export interface SurveyComponent {
  id: number;
  code: string;
  title: string;
  intro: string | null;
  questions: Question[];
}

export interface SurveySchema {
  campaign: { id: string; name: string; isOpen: boolean };
  areas: Area[];
  procesos: Proceso[];
  roles: RespondentRole[];
  components: SurveyComponent[];
  settings: {
    maxAreasInteraccion: number;
  };
}

/**
 * Identificación previa a la encuesta. Los tres campos son obligatorios. El documento solo
 * comprueba que la persona esté en la nómina y no haya respondido ya: no viaja con los pasos.
 */
export interface Identity {
  numeroDocumento: string;
  ownArea: string;
  respondentRole: string;
}

export const EMPTY_IDENTITY: Identity = { numeroDocumento: '', ownArea: '', respondentRole: '' };

/** El centinela que el back usa para las respuestas globales. */
export const GLOBAL_AREA_CODE = '__GLOBAL__';

/** Códigos de pregunta con significado especial para el flujo del wizard. */
export const PIVOT_QUESTION = 'c1_areas_interaccion';
/**
 * La marcación especial del área con la que más se relaciona. No se pinta como pregunta
 * aparte: viaja dentro del selector de áreas de 1.1, porque marcar "la principal" solo
 * tiene sentido mirando la lista que se acaba de elegir.
 */
export const PRIMARY_AREA_QUESTION = 'c1_area_principal';
export const OTHER_OPTION_VALUES = ['OTRA', 'OTRO'];

/**
 * Valor de una respuesta. La variante discriminada evita el clásico bug de tratar un 0
 * como "sin responder": `{ kind: 'number', value: 0 }` es una respuesta real.
 */
export type AnswerValue =
  | { kind: 'option'; value: string; otherText?: string }
  | { kind: 'options'; values: string[]; otherText?: string }
  | { kind: 'number'; value: number }
  | { kind: 'text'; value: string };

/** Clave plana de react-hook-form; replica la unicidad de la tabla `answers`. */
export function fieldName(questionCode: string, targetArea = GLOBAL_AREA_CODE): string {
  return `${questionCode}__${targetArea}`;
}

export function parseFieldName(name: string): { questionCode: string; targetArea: string } {
  const [questionCode, targetArea] = name.split('__');
  return { questionCode, targetArea: targetArea || GLOBAL_AREA_CODE };
}

// ---------- payloads de la API de respuestas ----------

export interface StartResponseResult {
  responseId: string;
  draftToken: string;
  startedAt: string;
}

export interface StoredAnswer {
  questionCode: string;
  targetArea: string;
  valueNumber: number | null;
  valueOption: string | null;
  valueOptions: string[];
  valueText: string | null;
}

export interface DraftResult {
  responseId: string;
  status: 'DRAFT' | 'COMPLETED';
  lastStep: number;
  ownArea: string | null;
  respondentRole: string | null;
  /** `null` en un borrador abierto antes de que la encuesta pidiera el documento. */
  numeroDocumento: string | null;
  answers: StoredAnswer[];
}

export interface AnswerPayload {
  questionCode: string;
  targetArea?: string;
  valueNumber?: number | null;
  valueOption?: string | null;
  valueOptions?: string[] | null;
  valueText?: string | null;
}

export interface RuleViolation {
  questionCode: string;
  targetArea?: string;
  message: string;
}

export interface MissingItem {
  questionCode: string;
  componentId: number;
  targetArea?: string;
}
