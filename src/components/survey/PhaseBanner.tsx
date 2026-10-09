'use client';

import { CheckIcon, PhaseIcon } from './PhaseIcon';
import type { SurveyPhase } from './survey-phases';

/**
 * La cinta que encabeza cada pantalla del bloque.
 *
 * Repite el bloque en el sitio donde está la mirada — encima del título — en lugar de
 * obligar a subir hasta la barra. Es la pieza que hace que el color signifique algo:
 * sin ella el tono sería decoración.
 */
export function PhaseBand({
  phase,
  detail,
}: {
  phase: SurveyPhase;
  /** Dónde está dentro del bloque, p. ej. "Componente 4 de 10". */
  detail: string;
}) {
  return (
    <div className="flex items-center gap-3.5 rounded-xl border border-phase-border border-l-4 border-l-phase-accent bg-phase-subtle px-4 py-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-phase text-phase-on">
        <PhaseIcon phase={phase} size={22} />
      </span>
      <div className="flex min-w-0 flex-col gap-0.5">
        <p className="text-[11px] font-bold uppercase tracking-wider text-phase">
          Bloque {phase.order} · {phase.name}
        </p>
        <p className="text-[13px] text-foreground-muted">{detail}</p>
      </div>
    </div>
  );
}

/**
 * El hito de entrada a un bloque.
 *
 * Sustituye a la cinta en la PRIMERA pantalla de cada bloque. Cierra lo anterior con un
 * visto y abre lo siguiente diciendo cuánto dura: el momento de mayor riesgo de abandono
 * es el cambio de tema, y se atraviesa mejor sabiendo que algo acaba de terminar.
 */
export function PhaseMilestone({
  phase,
  previous,
  screens,
}: {
  phase: SurveyPhase;
  previous: SurveyPhase | null;
  /** Cuántas pantallas trae el bloque que empieza. */
  screens: number;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-phase-border border-l-4 border-l-phase-accent bg-phase-subtle px-5 py-4">
      {previous && (
        <p className="flex items-center gap-2 text-[13px] font-medium text-phase">
          <CheckIcon size={15} className="shrink-0" />
          Terminó «{previous.name}». Van {previous.order} de 4 bloques.
        </p>
      )}

      <div className="flex items-center gap-3.5">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-phase text-phase-on">
          <PhaseIcon phase={phase} size={24} />
        </span>
        <div className="flex min-w-0 flex-col gap-0.5">
          <p className="text-[11px] font-bold uppercase tracking-wider text-phase">
            Bloque {phase.order} · {phase.name}
          </p>
          <h3 className="text-base text-foreground">{phase.promise}</h3>
          <p className="text-[13px] text-foreground-muted">
            {screens === 1 ? 'Una pantalla' : `${screens} pantallas`}. {phase.payoff}
          </p>
        </div>
      </div>
    </div>
  );
}
