'use client';

import type { AnswerValue, Question, QuestionType } from '@/lib/survey-schema.types';
import { MultiChoiceField } from './fields/MultiChoiceField';
import { ScaleField } from './fields/ScaleField';
import { SingleChoiceField } from './fields/SingleChoiceField';
import { TextField } from './fields/TextField';
import type { FieldProps } from './fields/field.types';
import { SummaryValue } from './SummaryValue';

/**
 * Mapa de tipo de pregunta a widget. Es lo que hace que el wizard sea dirigido por el
 * catálogo: añadir una pregunta al instrumento no obliga a tocar React.
 *
 * MATRIX_AREA comparte widget con SCALE_0_10 — visualmente son lo mismo. Lo que cambia es
 * quién pagina por área, y eso vive un nivel arriba, en los contenedores de paso.
 */
const FIELD_BY_TYPE: Record<QuestionType, React.ComponentType<FieldProps>> = {
  SINGLE: SingleChoiceField,
  MULTI: MultiChoiceField,
  SCALE_0_10: ScaleField,
  TEXT: TextField,
  MATRIX_AREA: ScaleField,
};

interface QuestionRendererProps {
  question: Question;
  value: AnswerValue | undefined;
  onChange: (value: AnswerValue) => void;
  areaContext?: { code: string; name: string };
  error?: string;
  disabled?: boolean;
  compact?: boolean;
  /** Marcación adicional sobre una opción ya seleccionada; ver `FieldProps`. */
  primary?: FieldProps['primary'];
  mode?: 'answer' | 'review';
}

/**
 * Renderiza UNA pregunta para UN par (pregunta, área). Deliberadamente tonto: no sabe de
 * pasos, ni de progreso, ni de cuántas áreas hay.
 */
export function QuestionRenderer({ mode = 'answer', ...props }: QuestionRendererProps) {
  if (mode === 'review') {
    return <SummaryValue question={props.question} value={props.value} />;
  }

  const Field = FIELD_BY_TYPE[props.question.type];
  return <Field {...props} />;
}
