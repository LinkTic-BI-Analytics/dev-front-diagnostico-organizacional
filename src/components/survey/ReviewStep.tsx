'use client';

import {
  GLOBAL_AREA_CODE,
  fieldName,
  type AnswerValue,
  type Identity,
  type SurveySchema,
} from '@/lib/survey-schema.types';
import { PhaseIcon } from './PhaseIcon';
import { QuestionRenderer } from './QuestionRenderer';
import { SURVEY_PHASES } from './survey-phases';
import { layoutOf } from './wizard-steps';

interface ReviewStepProps {
  schema: SurveySchema;
  answers: Record<string, AnswerValue | undefined>;
  evaluableAreas: { code: string; name: string }[];
  identity: Identity;
  onEdit: (componentId: number) => void;
}

/**
 * Resumen antes de enviar. Reutiliza el mismo `QuestionRenderer` en modo lectura en vez de
 * recorrer el catálogo con su propia lógica de presentación, para que lo que el encuestado
 * revisa sea exactamente lo que respondió.
 */
export function ReviewStep({
  schema,
  answers,
  evaluableAreas,
  identity,
  onEdit,
}: ReviewStepProps) {
  // La identificación no es un componente del instrumento, pero sí condiciona todo lo
  // demás: se muestra primero para que el encuestado pueda corregirla antes de enviar.
  const ownArea = schema.areas.find((area) => area.code === identity.ownArea);
  const role = schema.roles.find((entry) => entry.value === identity.respondentRole);

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-foreground-muted">
        Revise sus respuestas antes de enviar. Puede volver a cualquier componente para
        modificarlas.
      </p>

      <section className="rounded-xl border border-border-subtle bg-surface-sunken p-4">
        <header className="mb-3 flex items-start justify-between gap-3">
          <h3 className="text-sm text-foreground">Identificación</h3>
          <button
            type="button"
            onClick={() => onEdit(0)}
            className="shrink-0 text-xs font-medium text-brand hover:underline"
          >
            Editar
          </button>
        </header>
        <dl className="flex flex-col gap-3">
          <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-3">
            <dt className="text-xs text-foreground-muted sm:w-1/2 sm:shrink-0">
              ¿A qué área pertenece?
            </dt>
            <dd className="text-sm text-foreground">{ownArea?.name ?? 'Sin responder'}</dd>
          </div>
          <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-3">
            <dt className="text-xs text-foreground-muted sm:w-1/2 sm:shrink-0">Cargo</dt>
            <dd className="text-sm text-foreground">{role?.label ?? 'Sin responder'}</dd>
          </div>
        </dl>
      </section>

      {SURVEY_PHASES.map((phase) => (
        <div key={phase.id} data-phase={phase.id} className="flex flex-col gap-3">
          <h3 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-phase">
            <PhaseIcon phase={phase} size={15} />
            Bloque {phase.order} · {phase.name}
          </h3>

          {/*
           * Las tarjetas del bloque se reparten en dos columnas en PC. Repasar dieciséis
           * componentes en fila india es la parte de la encuesta que más se abandona: si el
           * resumen entra casi entero en pantalla, «Enviar» deja de estar a cinco scrolls.
           */}
          <div className="lg:columns-2 lg:gap-4">
            {phase.componentIds.map((componentId) => {
              const component = schema.components.find((item) => item.id === componentId);
              if (!component) return null;
              const perArea = layoutOf(component) !== 'simple';

              return (
                <section
                  key={component.id}
                  className="rounded-xl border border-phase-border bg-white p-4 lg:mb-4 lg:break-inside-avoid lg:last:mb-0"
                >
                  <header className="mb-3 flex items-start justify-between gap-3">
                    <h4 className="text-sm font-bold text-foreground">
                      {component.id}. {component.title}
                    </h4>
                    <button
                      type="button"
                      onClick={() => onEdit(component.id)}
                      className="shrink-0 text-xs font-medium text-phase hover:underline"
                    >
                      Editar
                    </button>
                  </header>

                  <dl className="flex flex-col gap-3">
                    {component.questions.map((question) => {
                      const targets =
                        question.perArea && perArea
                          ? evaluableAreas
                          : [{ code: GLOBAL_AREA_CODE, name: '' }];

                      return targets.map((target) => {
                        const key = fieldName(question.code, target.code);
                        return (
                          <div
                            key={key}
                            className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-3"
                          >
                            <dt className="text-xs text-foreground-muted sm:w-1/2 sm:shrink-0">
                              {question.label}
                              {target.name && <span className="text-phase"> · {target.name}</span>}
                            </dt>
                            <dd>
                              <QuestionRenderer
                                mode="review"
                                question={question}
                                value={answers[key]}
                                onChange={() => undefined}
                              />
                            </dd>
                          </div>
                        );
                      });
                    })}
                  </dl>
                </section>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
