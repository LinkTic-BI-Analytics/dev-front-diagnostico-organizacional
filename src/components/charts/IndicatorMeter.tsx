import Link from 'next/link';
import type { ThresholdBand } from '@/lib/admin.types';
import { classify, formatIndex } from '@/lib/score-scale';
import { stagger } from './chart-utils';
import { EmptyState } from './InsufficientData';

export interface MeterRow {
  key: string;
  label: string;
  value: number | null;
  hint?: string;
  /** Referencia en la misma escala 0-100 (el promedio de la empresa), como marca vertical. */
  benchmark?: number | null;
}

/**
 * Un índice 0-100 sobre su pista.
 *
 * Es un medidor y no una barra de ranking: la pista completa está siempre a la vista, así
 * que se lee «cuánto de lo posible» y no solo «más que el de al lado». Para ocho índices
 * que comparten escala, eso es lo que importa.
 *
 * Los tramos del semáforo van pintados en la pista misma, cada uno en un velo de su color:
 * sin ellos un 62 y un 58 se ven casi iguales, cuando uno es «Aceptable» y el otro «En
 * riesgo». La banda va además escrita al lado de la cifra.
 */
export function IndicatorMeters({
  rows,
  bands,
  emptyMessage,
  href,
  anchors,
}: {
  rows: MeterRow[];
  bands: ThresholdBand[];
  emptyMessage?: string;
  href?: (row: MeterRow) => string;
  /** Cada fila lleva el código como ancla (`#IAG`), para llegar desde otra vista. */
  anchors?: boolean;
}) {
  if (rows.length === 0) {
    return <EmptyState message={emptyMessage ?? 'Sin indicadores para mostrar.'} />;
  }

  const tramos = [...bands]
    .sort((a, b) => a.minValue - b.minValue)
    .map((band) => ({
      band,
      left: Math.max(band.minValue, 0),
      width: Math.min(band.maxValue, 100) - Math.max(band.minValue, 0),
    }));

  return (
    <ul className="flex flex-col gap-4">
      {rows.map((row, index) => {
        const band = classify(row.value, bands);
        const width = row.value === null ? 0 : Math.max(row.value, 1);

        return (
          <li
            key={row.key}
            id={anchors ? row.key : undefined}
            className="flex scroll-mt-24 flex-col gap-1.5 rounded-lg target:bg-brand-subtle target:ring-8 target:ring-brand-subtle"
          >
            <div className="flex items-baseline justify-between gap-3">
              <span className="min-w-0 text-sm text-foreground">
                {href ? (
                  <Link href={href(row)} className="underline-offset-4 hover:underline">
                    {row.label}
                  </Link>
                ) : (
                  row.label
                )}
              </span>
              <span className="flex shrink-0 items-baseline gap-2">
                <span className="text-sm font-semibold tabular-nums text-foreground">
                  {formatIndex(row.value, 1)}
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs text-foreground-muted">
                  <span
                    aria-hidden
                    className="size-2 rounded-full"
                    style={{ backgroundColor: band?.color ?? 'var(--border-strong)' }}
                  />
                  {band?.label ?? 'sin dato'}
                </span>
              </span>
            </div>

            <div className="relative h-2.5 w-full">
              <div className="absolute inset-0 overflow-hidden rounded-full bg-surface-muted">
                {tramos.map(({ band: tramo, left, width: ancho }) => (
                  <span
                    key={tramo.label}
                    aria-hidden
                    className="absolute inset-y-0 border-r-2 border-white last:border-r-0"
                    style={{
                      left: `${left}%`,
                      width: `${ancho}%`,
                      backgroundColor: `color-mix(in srgb, ${tramo.color} 14%, transparent)`,
                    }}
                  />
                ))}
                <div
                  className="lk-graf-barra absolute inset-y-0 left-0 rounded-full"
                  style={{
                    width: `${width}%`,
                    backgroundColor: band?.color ?? 'var(--border-strong)',
                    ...stagger(index),
                  }}
                />
              </div>
              {row.benchmark !== null && row.benchmark !== undefined && (
                <span
                  aria-hidden
                  title={`Empresa: ${formatIndex(row.benchmark, 1)}`}
                  className="absolute -inset-y-1 w-0.5 -translate-x-1/2 rounded-full bg-[var(--chart-benchmark)]"
                  style={{ left: `${row.benchmark}%` }}
                />
              )}
            </div>

            {row.hint && <p className="text-xs text-foreground-subtle">{row.hint}</p>}
          </li>
        );
      })}
    </ul>
  );
}
