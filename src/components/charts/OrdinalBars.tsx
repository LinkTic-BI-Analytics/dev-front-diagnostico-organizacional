import type { DistributionRow } from '@/lib/admin.types';
import { formatShare } from '@/lib/score-scale';
import { stagger } from './chart-utils';
import { EmptyState } from './InsufficientData';

const RAMP = [
  'var(--ramp-1)',
  'var(--ramp-2)',
  'var(--ramp-3)',
  'var(--ramp-4)',
  'var(--ramp-5)',
];

/**
 * Distribución sobre una escala ORDENADA, con el orden pintado en el color.
 *
 * La frecuencia de interacción tiene orden natural (diaria, varias por semana, semanal,
 * mensual, esporádica), y perderlo es perder el dato: lo que interesa no es qué opción gana sino hacia qué extremo
 * se inclina la masa. Por eso conserva el orden de la escala —nunca se reordena por
 * frecuencia— y muestra las opciones en cero, porque un hueco también es información.
 *
 * Un solo tono en pasos de luminancia, no cinco colores: las categorías están ordenadas,
 * así que el color debe mostrar esa secuencia. Cinco tonos distintos sugerirían que son
 * cosas independientes.
 *
 * `outOfScale` marca las opciones que no pertenecen a la escala ("No aplica"): van en gris
 * y no consumen un paso de la rampa, porque pintarlas con el tono más oscuro las leería
 * como el extremo peor.
 */
export function OrdinalBars({
  rows,
  emptyMessage,
  outOfScale = [],
}: {
  rows: DistributionRow[];
  emptyMessage?: string;
  outOfScale?: string[];
}) {
  const total = rows.reduce((sum, row) => sum + row.count, 0);
  if (total === 0) {
    return <EmptyState message={emptyMessage ?? 'Sin respuestas registradas.'} />;
  }

  const tope = Math.max(...rows.map((row) => row.share), 1);
  const scaled = rows.filter((row) => !outOfScale.includes(row.value));

  return (
    <ul className="flex flex-col gap-2">
      {rows.map((row, index) => (
        <li key={row.value} className="flex items-center gap-3">
          <span className="w-32 shrink-0 text-[13px] leading-snug text-foreground sm:w-44">{row.label}</span>
          <span className="h-5 flex-1">
            <span
              className="lk-graf-barra block h-3 translate-y-1 rounded-r"
              style={{
                width: `${Math.max((row.share / tope) * 100, row.share > 0 ? 1.5 : 0)}%`,
                backgroundColor: outOfScale.includes(row.value)
                  ? 'var(--border-strong)'
                  : RAMP[Math.min(scaled.indexOf(row), RAMP.length - 1)],
                ...stagger(index),
              }}
            />
          </span>
          <span className="w-28 shrink-0 text-right text-[13px] tabular-nums text-foreground-subtle">
            <span className="font-semibold text-foreground">{formatShare(row.share)}</span> ·{' '}
            {row.count}
          </span>
        </li>
      ))}
    </ul>
  );
}
