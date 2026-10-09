import { PhaseIcon } from './PhaseIcon';
import { SURVEY_PHASES } from './survey-phases';

/**
 * El recorrido completo, antes de empezar.
 *
 * Quien sabe cuántos tramos hay y de qué trata cada uno abandona menos que quien avanza a
 * ciegas: el abandono a mitad de camino casi siempre es la sospecha de que el formulario
 * no se acaba nunca. Aquí además se aprende el código de color, así que al llegar al
 * primer cambio de tono ya está explicado.
 */
export function PhaseRoadmap() {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-[15px] text-foreground">El recorrido son cuatro bloques</h2>
        <span className="text-xs text-foreground-muted">15 minutos en total</span>
      </div>

      {/* Dos por fila en cuanto hay ancho: cuatro tarjetas apiladas empujan el botón de
          empezar fuera de la primera pantalla, y el recorrido se entiende igual de bien. */}
      <ol className="grid gap-2.5 sm:grid-cols-2">
        {SURVEY_PHASES.map((phase) => (
          <li
            key={phase.id}
            data-phase={phase.id}
            className="flex items-start gap-3.5 rounded-xl border border-phase-border border-l-4 border-l-phase-accent bg-phase-subtle px-4 py-3.5"
          >
            <span className="flex size-[34px] shrink-0 items-center justify-center rounded-xl bg-phase text-phase-on">
              <PhaseIcon phase={phase} size={19} />
            </span>
            <div className="flex min-w-0 flex-col gap-0.5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-phase">
                Bloque {phase.order} · {phase.name}
              </p>
              <p className="text-sm font-semibold text-foreground">{phase.promise}</p>
              <p className="text-[12.5px] leading-relaxed text-foreground-muted">
                {phase.payoff}
              </p>
            </div>
          </li>
        ))}
      </ol>

      <p className="flex items-center gap-2 text-xs text-foreground-muted">
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="shrink-0"
        >
          <path d="M20 6 9 17l-5-5" />
        </svg>
        Su avance se guarda al pasar de pantalla. Puede cerrar y retomar donde quedó.
      </p>
    </div>
  );
}
