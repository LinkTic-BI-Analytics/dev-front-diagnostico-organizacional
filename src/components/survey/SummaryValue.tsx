import type { AnswerValue, Question } from '@/lib/survey-schema.types';

/**
 * Formatea una respuesta para mostrarla. Función pura y compartida para que el paso de
 * revisión no reimplemente el catálogo con su propio criterio de presentación.
 */
export function formatAnswerValue(
  question: Question,
  value: AnswerValue | undefined,
): string {
  if (!value) return 'Sin responder';

  switch (value.kind) {
    case 'number':
      return `${value.value} de 10`;
    case 'option': {
      const label =
        question.options.find((option) => option.value === value.value)?.label ?? value.value;
      return value.otherText ? `${label}: ${value.otherText}` : label;
    }
    case 'options': {
      if (value.values.length === 0) return 'Sin responder';
      const labels = value.values.map(
        (entry) => question.options.find((option) => option.value === entry)?.label ?? entry,
      );
      const joined = labels.join(', ');
      return value.otherText ? `${joined} (${value.otherText})` : joined;
    }
    case 'text':
      return value.value.trim().length === 0 ? 'Sin responder' : value.value;
  }
}

export function SummaryValue({
  question,
  value,
}: {
  question: Question;
  value: AnswerValue | undefined;
}) {
  const text = formatAnswerValue(question, value);
  const isEmpty = text === 'Sin responder';

  return (
    <span className={isEmpty ? 'text-sm text-foreground-muted italic' : 'text-sm text-foreground'}>
      {text}
    </span>
  );
}
