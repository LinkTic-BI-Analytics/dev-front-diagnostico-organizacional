'use client';

import { CheckIcon } from './PhaseIcon';
import type { PhaseSegment } from './survey-phases';

interface PhaseProgressProps {
  segments: PhaseSegment[];
  /** Paso actual y total, para quien prefiere el número al tramo. */
  current: number;
  total: number;
  remainingMinutes: number | null;
}

/**
 * La barra, partida en cuatro tramos de color en vez de uno solo.
 *
 * Una barra única contesta "cuánto llevo"; estos tramos contestan además "de qué se trata
 * lo que viene" y "cuánto falta de ESTO", que es la pregunta que se hace quien está a
 * punto de abandonar. Cada tramo lleva el color de su bloque, así que la barra es también
 * la leyenda del color que tiñe el resto de la pantalla.
 *
 * El ancho de cada tramo es proporcional a sus pasos, no igual entre bloques: el primero
 * son seis pantallas de dieciséis y fingir que es un cuarto del camino haría que el avance
 * se sintiera estancado justo ahí.
 */
export function PhaseProgress({
  segments,
  current,
  total,
  remainingMinutes,
}: PhaseProgressProps) {
  const percent = total === 0 ? 0 : Math.round((current / total) * 100);
  const active = segments.find((segment) => segment.state === 'current');
  const steps = segments.reduce((sum, segment) => sum + segment.total, 0);

  return (
    <div
      className="sticky top-3 z-20 flex flex-col gap-2 rounded-2xl bg-white/90 px-4 py-3 shadow-[0_0_0_1px_#0f172a12,0_10px_30px_-18px_#0f172a40] backdrop-blur-md sm:px-5"
      data-phase={active?.phase.id}
    >
      <div className="flex items-baseline justify-between gap-3">
        <p className="truncate text-xs font-semibold text-phase sm:text-[13px]">
          {active
            ? `Bloque ${active.phase.order} de ${segments.length} · ${active.phase.name}`
            : 'Revisión final'}
        </p>
        <p className="shrink-0 text-xs text-foreground-muted">
          {current} de {total}
          {remainingMinutes !== null && remainingMinutes > 0 && (
            <> · ≈ {remainingMinutes} min</>
          )}
        </p>
      </div>

      <div
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Avance de la encuesta"
        aria-valuetext={
          active
            ? `${percent} por ciento. Bloque ${active.phase.order} de ${segments.length}, ${active.phase.name}.`
            : `${percent} por ciento. Revisión final.`
        }
        className="flex gap-1.5"
      >
        {segments.map((segment) => (
          <div
            key={segment.phase.id}
            data-phase={segment.phase.id}
            // Cada tramo pesa lo que pesan sus pasos.
            style={{ flexGrow: Math.max(segment.total, 1) }}
            className="h-2 overflow-hidden rounded-full bg-surface-muted"
          >
            <div
              className="h-full rounded-full bg-phase transition-[width] duration-500"
              style={{ width: `${segment.percent}%` }}
            />
          </div>
        ))}
      </div>

      <ol className="flex gap-1.5" aria-hidden="true">
        {segments.map((segment) => (
          <li
            key={segment.phase.id}
            data-phase={segment.phase.id}
            style={{ flexGrow: Math.max(segment.total, 1), flexBasis: 0 }}
            className="flex min-w-0 items-center gap-1"
          >
            {segment.state === 'done' && <CheckIcon size={11} className="shrink-0 text-phase" />}
            <span
              className={[
                'truncate text-[10px] uppercase tracking-wide',
                segment.state === 'pending'
                  ? 'text-foreground-muted/70'
                  : segment.state === 'current'
                    ? 'font-bold text-phase'
                    : 'font-medium text-phase',
              ].join(' ')}
            >
              {segment.phase.name}
            </span>
          </li>
        ))}
      </ol>

      {/* El conteo real de pantallas, para lectores de pantalla y para quien lo busque. */}
      <p className="sr-only">
        Pantalla {current} de {total}. El instrumento tiene {steps} pantallas de preguntas.
      </p>
    </div>
  );
}
