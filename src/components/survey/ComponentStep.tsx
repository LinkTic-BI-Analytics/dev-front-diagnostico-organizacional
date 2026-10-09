'use client';

import {
  PIVOT_QUESTION,
  PRIMARY_AREA_QUESTION,
  fieldName,
  type AnswerValue,
  type Question,
} from '@/lib/survey-schema.types';
import { QuestionRenderer } from './QuestionRenderer';
import { QuestionBlock } from './StepShell';

export interface StepEntry {
  question: Question;
  targetArea: string;
  areaName?: string;
}

interface ComponentStepProps {
  entries: StepEntry[];
  answers: Record<string, AnswerValue | undefined>;
  errors: Record<string, string>;
  onChange: (key: string, value: AnswerValue | undefined) => void;
  disabled?: boolean;
}

/**
 * Un componente por pantalla. El instrumento nunca pone más de cinco ítems por componente,
 * que es justo el techo que sostiene la sensación de avance del wizard.
 */
export function ComponentStep({
  entries,
  answers,
  errors,
  onChange,
  disabled,
}: ComponentStepProps) {
  // La relación principal no se pinta como pregunta aparte: es una estrella sobre las
  // áreas que se acaban de marcar en 1.1. Preguntarla en un bloque propio obligaría a
  // releer la lista de subprocesos para repetir una de las cinco ya elegidas.
  const primaryEntry = entries.find(
    (entry) => entry.question.code === PRIMARY_AREA_QUESTION,
  );
  const primaryKey = primaryEntry
    ? fieldName(primaryEntry.question.code, primaryEntry.targetArea)
    : null;
  const primaryAnswer = primaryKey ? answers[primaryKey] : undefined;

  const primary = primaryEntry && primaryKey
    ? {
        value: primaryAnswer?.kind === 'option' ? primaryAnswer.value : null,
        onChange: (value: string | null) =>
          onChange(primaryKey, value ? { kind: 'option', value } : undefined),
        label: primaryEntry.question.label,
        error: errors[primaryKey],
      }
    : undefined;

  return (
    <>
      {entries
        .filter((entry) => entry.question.code !== PRIMARY_AREA_QUESTION)
        .map(({ question, targetArea, areaName }) => {
          const key = fieldName(question.code, targetArea);
          return (
            <QuestionBlock
              key={key}
              label={question.label}
              helpText={question.helpText}
              required={question.required}
            >
              <QuestionRenderer
                question={question}
                value={answers[key]}
                error={errors[key]}
                disabled={disabled}
                areaContext={areaName ? { code: targetArea, name: areaName } : undefined}
                primary={question.code === PIVOT_QUESTION ? primary : undefined}
                onChange={(value) => onChange(key, value)}
              />
            </QuestionBlock>
          );
        })}
    </>
  );
}

/**
 * Componente 9: una fila compacta por área evaluada.
 *
 * Se agrupa por pregunta y no por área para que el encuestado califique lo mismo varias
 * veces seguidas: comparar áreas entre sí es más fácil que recordar el criterio al saltar
 * de pregunta en pregunta.
 */
export function ComponentStepPerAreaList({
  entries,
  answers,
  errors,
  onChange,
  disabled,
}: ComponentStepProps) {
  const grouped = new Map<string, StepEntry[]>();
  for (const entry of entries) {
    const group = grouped.get(entry.question.code);
    if (group) group.push(entry);
    else grouped.set(entry.question.code, [entry]);
  }

  return (
    <>
      {[...grouped.values()].map((group) => {
        const { question } = group[0];
        const isPerArea = question.perArea;

        return (
          <QuestionBlock
            key={question.code}
            label={question.label}
            helpText={question.helpText}
            required={question.required}
          >
            {isPerArea ? (
              <div className="flex flex-col gap-5 lg:gap-3.5">
                {group.map(({ targetArea, areaName }) => {
                  const key = fieldName(question.code, targetArea);
                  return (
                    /*
                     * En PC el área y su escala son una fila, no dos: cinco áreas apiladas
                     * con el nombre encima de cada regla ocupan el doble de alto y obligan
                     * a bajar para comparar la cuarta con la primera, que es exactamente lo
                     * que esta pantalla pide hacer.
                     */
                    <div
                      key={key}
                      className="flex flex-col gap-2 lg:grid lg:grid-cols-[minmax(0,13rem)_minmax(0,1fr)] lg:items-center lg:gap-5"
                    >
                      <p className="text-sm font-medium text-phase lg:text-right">
                        {areaName ?? targetArea}
                      </p>
                      <QuestionRenderer
                        compact
                        question={question}
                        value={answers[key]}
                        error={errors[key]}
                        disabled={disabled}
                        areaContext={{ code: targetArea, name: areaName ?? targetArea }}
                        onChange={(value) => onChange(key, value)}
                      />
                    </div>
                  );
                })}
              </div>
            ) : (
              <QuestionRenderer
                question={question}
                value={answers[fieldName(question.code, group[0].targetArea)]}
                error={errors[fieldName(question.code, group[0].targetArea)]}
                disabled={disabled}
                onChange={(value) =>
                  onChange(fieldName(question.code, group[0].targetArea), value)
                }
              />
            )}
          </QuestionBlock>
        );
      })}
    </>
  );
}
