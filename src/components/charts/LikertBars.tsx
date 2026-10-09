'use client';

import { Fragment } from 'react';
import clsx from 'clsx';
import type { ThresholdBand } from '@/lib/admin.types';
import { formatIndex, formatNumber, formatSigned } from '@/lib/score-scale';
import { stagger } from './chart-utils';
import { EmptyState } from './InsufficientData';

export interface LikertRow {
  key: string;
  label: string;
  /** Encabezado de grupo (el componente); se pinta cuando cambia respecto a la fila anterior. */
  group?: string;
  /** Conteo de cada nota, del 0 al 10. */
  distribution: number[];
  /** Índice 0-100 de la afirmación, para el tooltip y la tabla. */
  index: number | null;
}

/** Colores por posición de la banda, de la peor a la mejor. */
const COLORS = ['var(--likert-1)', 'var(--likert-2)', 'var(--likert-3)', 'var(--likert-4)'];
const INKS = ['#ffffff', '#4a1210', '#0d2f5c', '#ffffff'];

export interface BandShare {
  band: ThresholdBand;
  share: number;
  color: string;
  ink: string;
  negative: boolean;
}

/**
 * Reparte las notas 0-10 de una afirmación en las bandas del semáforo. Una nota de 5 es un
 * 50 en la escala de los índices, así que cae en la misma banda en que caería un índice de
 * 50: la lectura de una afirmación y la de su componente hablan el mismo idioma.
 */
export function bandShares(distribution: number[], bands: ThresholdBand[]): BandShare[] {
  const ordered = [...bands].sort((a, b) => a.minValue - b.minValue);
  const total = distribution.reduce((sum, count) => sum + count, 0);
  const half = Math.floor(ordered.length / 2);

  // Cada nota va a la última banda cuyo mínimo no la supera. Comparar contra el máximo
  // de la banda fallaría con umbrales como 39,99 / 40: la nota 4 (40) caería en las dos.
  const bandOfScore = distribution.map((_, score) => {
    const asIndex = score * 10;
    let found = 0;
    ordered.forEach((band, index) => {
      if (band.minValue <= asIndex) found = index;
    });
    return found;
  });

  return ordered.map((band, index) => {
    const count = distribution.reduce(
      (sum, value, score) => (bandOfScore[score] === index ? sum + value : sum),
      0,
    );
    const colorIndex = index < half ? Math.min(index, 1) : Math.min(2 + (index - half), 3);
    return {
      band,
      share: total === 0 ? 0 : (count / total) * 100,
      color: COLORS[colorIndex],
      ink: INKS[colorIndex],
      negative: index < half,
    };
  });
}

/** Lo favorable menos lo desfavorable: el «NPS» de cada afirmación, de −100 a +100. */
export function netScore(shares: BandShare[]): number {
  return shares.reduce((sum, entry) => sum + (entry.negative ? -entry.share : entry.share), 0);
}

/**
 * Las afirmaciones en barras divergentes (escala Likert): a la izquierda del cero las notas
 * que caen en las bandas bajas, a la derecha las altas.
 *
 * Es la forma estándar para una batería de preguntas de acuerdo, y aquí contesta lo que el
 * promedio esconde: un 6 de promedio puede ser «todos dan 6» o «la mitad da 2 y la mitad
 * da 10», y son diagnósticos opuestos. El largo de cada lado es la masa que cae ahí, y el
 * número de la derecha es el neto.
 */
export function LikertBars({
  rows,
  bands,
  onSelect,
  emptyMessage,
}: {
  rows: LikertRow[];
  bands: ThresholdBand[];
  onSelect?: (key: string) => void;
  emptyMessage?: string;
}) {
  if (rows.length === 0 || bands.length === 0) {
    return <EmptyState message={emptyMessage ?? 'Sin afirmaciones con dato para mostrar.'} />;
  }

  const legend = bandShares(new Array(11).fill(0), bands);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3 text-[13px] text-foreground-muted sm:pr-16 sm:pl-[17rem]">
        <span className="flex flex-wrap items-center gap-3">
          {legend.filter((entry) => entry.negative).map((entry) => (
            <span key={entry.band.label} className="flex items-center gap-1.5">
              <span aria-hidden className="size-2.5 rounded-[3px]" style={{ backgroundColor: entry.color }} />
              {entry.band.label}
            </span>
          ))}
        </span>
        <span className="flex flex-wrap items-center gap-3">
          {legend.filter((entry) => !entry.negative).map((entry) => (
            <span key={entry.band.label} className="flex items-center gap-1.5">
              <span aria-hidden className="size-2.5 rounded-[3px]" style={{ backgroundColor: entry.color }} />
              {entry.band.label}
            </span>
          ))}
        </span>
      </div>

      <ul className="flex flex-col gap-1">
        {rows.map((row, index) => {
          const shares = bandShares(row.distribution, bands);
          // De la peor a la menos mala, de izquierda a derecha: «Crítico» queda en el extremo
          // y «En riesgo» junto al cero, en espejo con el lado favorable.
          const negatives = shares.filter((entry) => entry.negative);
          const positives = shares.filter((entry) => !entry.negative);
          const net = netScore(shares);
          const newGroup = row.group && row.group !== rows[index - 1]?.group;
          const description = shares.map((entry) => `${entry.band.label} ${formatNumber(entry.share, 0)} %`).join(', ');

          const body = (
            <>
              <span className="min-w-0 text-left text-[13px] leading-snug text-foreground sm:w-64 sm:shrink-0">
                {row.label}
              </span>
              <span className="relative flex h-6 min-w-0 flex-1" aria-hidden>
                <span className="absolute inset-y-0 left-1/2 w-px bg-[var(--chart-benchmark)] opacity-40" />
                <span className="flex w-1/2 justify-end gap-0.5 pr-px">
                  {negatives.map((entry) => (
                    <Segment key={entry.band.label} entry={entry} index={index} side="left" />
                  ))}
                </span>
                <span className="flex w-1/2 gap-0.5 pl-px">
                  {positives.map((entry) => (
                    <Segment key={entry.band.label} entry={entry} index={index} side="right" />
                  ))}
                </span>
              </span>
              <span className="w-14 shrink-0 text-right text-[13px] font-semibold tabular-nums text-foreground">
                {formatSigned(net, 0)}
              </span>
            </>
          );

          return (
            <Fragment key={row.key}>
              {newGroup && (
                <li
                  aria-hidden
                  className="mt-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-foreground-subtle first:mt-0"
                >
                  {row.group}
                </li>
              )}
              <li>
                {onSelect ? (
                  <button
                    type="button"
                    onClick={() => onSelect(row.key)}
                    aria-label={`${row.label}: índice ${formatIndex(row.index, 1)}, neto ${formatSigned(net, 0)}. ${description}. Ver el detalle`}
                    title={`${row.label} · índice ${formatIndex(row.index, 1)} · ${description}`}
                    className="flex w-full flex-col gap-1 rounded-lg px-1 py-1 text-left transition-colors hover:bg-surface-muted sm:flex-row sm:items-center sm:gap-3"
                  >
                    {body}
                  </button>
                ) : (
                  <div className="flex flex-col gap-1 px-1 py-1 sm:flex-row sm:items-center sm:gap-3" title={description}>
                    {body}
                  </div>
                )}
              </li>
            </Fragment>
          );
        })}
      </ul>
    </div>
  );
}

function Segment({ entry, index, side }: { entry: BandShare; index: number; side: 'left' | 'right' }) {
  if (entry.share <= 0) return null;
  return (
    <span
      className={clsx(
        'lk-graf-barra flex h-full items-center justify-center overflow-visible text-[11px] font-semibold tabular-nums',
        side === 'left' ? 'first:rounded-l' : 'last:rounded-r',
      )}
      style={{
        width: `${entry.share}%`,
        backgroundColor: entry.color,
        color: entry.ink,
        transformOrigin: side === 'left' ? 'right center' : 'left center',
        ...stagger(index, 0.02),
      }}
    >
      {/* El número va dentro solo si cabe con aire; si no, queda en el tooltip y la tabla. */}
      {entry.share >= 14 ? `${formatNumber(entry.share, 0)}` : null}
    </span>
  );
}
