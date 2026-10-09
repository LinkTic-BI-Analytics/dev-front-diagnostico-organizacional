'use client';

import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { AreaProgress } from './AreaProgress';
import { ComponentStep, ComponentStepPerAreaList } from './ComponentStep';
import { PhaseBand, PhaseMilestone } from './PhaseBanner';
import { PhaseProgress } from './PhaseProgress';
import { ReviewStep } from './ReviewStep';
import { StepShell } from './StepShell';
import { WelcomeStep } from './WelcomeStep';
import { useSurveyWizard } from './useSurveyWizard';
import { fieldName } from '@/lib/survey-schema.types';
import {
  SURVEY_PHASES,
  phaseOfStep,
  phaseSegments,
  positionInPhase,
} from './survey-phases';
import { layoutOf } from './wizard-steps';

export function SurveyWizard() {
  const router = useRouter();
  const { state, currentStep, currentComponent, currentEntries, evaluableAreas, actions } =
    useSurveyWizard();

  useEffect(() => {
    if (state.submitted) router.push('/gracias');
  }, [state.submitted, router]);

  // Al cambiar de paso el foco vuelve arriba: sin esto, en móvil el usuario queda a media
  // pantalla y no ve el encabezado del componente nuevo.
  useEffect(() => {
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [state.stepIndex]);

  const phase = phaseOfStep(currentStep);
  const segments = useMemo(
    () => phaseSegments(state.steps, state.stepIndex),
    [state.steps, state.stepIndex],
  );
  const inPhase = useMemo(
    () => positionInPhase(state.steps, state.stepIndex),
    [state.steps, state.stepIndex],
  );

  /** Respondidas del paso, para el contador del pie. */
  const answered = useMemo(() => {
    const required = currentEntries.filter((entry) => entry.question.required !== false);
    return {
      total: required.length,
      done: required.filter(
        (entry) => state.answers[fieldName(entry.question.code, entry.targetArea)] !== undefined,
      ).length,
    };
  }, [currentEntries, state.answers]);

  if (state.loading) {
    return (
      <div className="lk-tarjeta py-16 text-center text-sm text-foreground-muted" role="status">
        Cargando la encuesta…
      </div>
    );
  }

  if (state.loadError || !state.schema) {
    return (
      <div className="lk-tarjeta px-6 py-16 text-center" role="alert">
        <p className="text-sm text-danger">{state.loadError}</p>
      </div>
    );
  }

  if (!state.started) {
    return (
      <div className="flex flex-col gap-6">
        {state.resumable && (
          <div className="lk-tarjeta lk-anim flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <p className="flex items-center gap-2.5 text-sm text-foreground">
              <span aria-hidden className="size-2 shrink-0 rounded-full bg-lk-blue" />
              Tiene una encuesta a medio diligenciar en este navegador.
            </p>
            <button
              type="button"
              onClick={() => void actions.resume()}
              disabled={state.busy}
              className="lk-button min-h-11 shrink-0 rounded-xl px-5 text-sm font-semibold"
            >
              Continuar donde quedé
            </button>
          </div>
        )}

        <SurveyCard>
        <WelcomeStep
          schema={state.schema}
          identity={state.identity}
          identityErrors={state.identityErrors}
          onIdentityChange={actions.setIdentity}
          onStart={() => void actions.begin()}
          busy={state.busy}
          error={state.stepError}
        />
        </SurveyCard>
      </div>
    );
  }

  const totalSteps = state.steps.length;
  const areaName =
    currentStep?.kind === 'component'
      ? evaluableAreas.find((area) => area.code === currentStep.areaCode)?.name
      : undefined;

  return (
    /*
     * `data-phase` es lo único que hay que poner para recolorear la pantalla entera: los
     * tokens `--phase-*` de `globals.css` cuelgan de él, así que el título, la cinta, la
     * escala 0-10 y el botón de continuar cambian de tono a la vez, sin pasar el color
     * por props hasta el último campo. Fuera de un bloque (bienvenida, revisión) los
     * tokens valen lo mismo que la marca.
     */
    <div className="flex flex-col gap-4" data-phase={phase?.id}>
      <PhaseProgress
        segments={segments}
        current={state.stepIndex + 1}
        total={totalSteps}
        remainingMinutes={state.remainingMinutes}
      />

      <SurveyCard tinted={Boolean(phase)}>

      {currentStep?.kind === 'welcome' && (
        <WelcomeStep
          schema={state.schema}
          identity={state.identity}
          identityErrors={state.identityErrors}
          onIdentityChange={actions.setIdentity}
          onStart={() => void actions.goNext()}
          busy={state.busy}
          error={state.stepError}
        />
      )}

      {currentStep?.kind === 'component' && currentComponent && phase && (
        <StepShell
          title={`${currentComponent.id}. ${currentComponent.title}`}
          intro={currentComponent.intro}
          banner={
            // El hito solo en la primera pantalla del bloque; en las demás, la cinta.
            inPhase?.position === 1 ? (
              <PhaseMilestone
                phase={phase}
                previous={SURVEY_PHASES[phase.order - 2] ?? null}
                screens={inPhase.total}
              />
            ) : (
              <PhaseBand
                phase={phase}
                detail={`Componente ${currentComponent.id} de ${state.schema.components.length}`}
              />
            )
          }
          subProgress={
            currentStep.areaTotal && currentStep.areaTotal > 1 && areaName ? (
              <AreaProgress
                areaName={areaName}
                index={currentStep.areaIndex ?? 1}
                total={currentStep.areaTotal}
              />
            ) : undefined
          }
          answered={answered}
          onBack={actions.goBack}
          onNext={() => void actions.goNext()}
          nextLabel={
            currentStep.areaTotal && currentStep.areaTotal > 1
              ? currentStep.areaIndex! < currentStep.areaTotal
                ? 'Siguiente área'
                : 'Continuar'
              : 'Continuar'
          }
          busy={state.busy}
          error={state.stepError}
        >
          {layoutOf(currentComponent) === 'list-per-area' ? (
            <ComponentStepPerAreaList
              entries={currentEntries}
              answers={state.answers}
              errors={state.errors}
              onChange={actions.setAnswer}
              disabled={state.busy}
            />
          ) : (
            <ComponentStep
              entries={currentEntries}
              answers={state.answers}
              errors={state.errors}
              onChange={actions.setAnswer}
              disabled={state.busy}
            />
          )}
        </StepShell>
      )}

      {currentStep?.kind === 'review' && (
        <StepShell
          title="Revise sus respuestas"
          onBack={actions.goBack}
          onNext={() => void actions.goNext()}
          nextLabel="Enviar la encuesta"
          busy={state.busy}
          error={state.stepError}
        >
          <ReviewStep
            schema={state.schema}
            answers={state.answers}
            evaluableAreas={evaluableAreas}
            identity={state.identity}
            onEdit={actions.goToComponent}
          />
        </StepShell>
      )}
      </SurveyCard>
    </div>
  );
}

/**
 * La tarjeta de la encuesta. Dentro de un bloque, el filete superior toma el acento del
 * bloque; en la bienvenida y la revisión, el degradado de la marca.
 */
function SurveyCard({ children, tinted }: { children: React.ReactNode; tinted?: boolean }) {
  return (
    <div className="lk-tarjeta lk-anim relative">
      <div
        aria-hidden
        className={tinted ? 'h-1.5 rounded-t-2xl bg-phase-accent' : 'lk-accent-bar h-1.5 rounded-t-2xl'}
      />
      <div className="px-5 pt-7 pb-7 sm:px-8 sm:pt-9 sm:pb-9">{children}</div>
    </div>
  );
}
