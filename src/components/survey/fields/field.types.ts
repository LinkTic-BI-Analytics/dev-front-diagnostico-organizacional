import type { AnswerValue, Question } from '@/lib/survey-schema.types';

export interface FieldProps {
  question: Question;
  value: AnswerValue | undefined;
  onChange: (value: AnswerValue) => void;
  /** Presente cuando la pregunta se responde por área evaluada. */
  areaContext?: { code: string; name: string };
  error?: string;
  disabled?: boolean;
  /** Variante compacta: una fila por área, para el NPS del componente 9. */
  compact?: boolean;
  /**
   * Marcación adicional sobre una de las opciones ya seleccionadas. Hoy la usa el
   * selector de áreas de 1.1 para señalar la relación principal, que es una respuesta
   * aparte (`c1_area_principal`) pero se marca dentro de la misma lista.
   */
  primary?: {
    value: string | null;
    onChange: (value: string | null) => void;
    label: string;
    error?: string;
  };
}

/** Identificador estable del campo, para `htmlFor` y `aria-describedby`. */
export function fieldId(question: Question, areaCode?: string): string {
  return areaCode ? `${question.code}--${areaCode}` : question.code;
}
