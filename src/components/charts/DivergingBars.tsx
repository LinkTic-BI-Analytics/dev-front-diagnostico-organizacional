import { formatSigned } from '@/lib/score-scale';
import { stagger } from './chart-utils';
import { EmptyState } from './InsufficientData';

export interface DivergingRow {
  key: string;
  label: string;
  value: number | null;
  /** Lo que se lee al pasar el cursor, y lo que va en la vista de tabla. */
  hint?: string;
}

/**
 * Barras a los dos lados de un cero.
 *
 * Es la forma de la polaridad: ningún extremo es «bueno», lo que importa es de qué lado
 * cae y cuánto. Una tabla de números con signo obliga a leer fila por fila para encontrar
 * los extremos; aquí saltan a la vista.
 *
 * Dos tonos, azul contra rojo (ΔE 21,6 con protanopia), porque dos fríos no se leen como
 * opuestos. Van con la etiqueta de su lado en el encabezado: el color refuerza, no
 * informa solo.
 */
export function DivergingBars({
  rows,
  negativeLabel,
  positiveLabel,
  unit = '',
  decimals = 1,
  emptyMessage,
}: {
  rows: DivergingRow[];
  negativeLabel: string;
  positiveLabel: string;
  unit?: string;
  /** Decimales del valor escrito: el NPS va entero, la brecha con uno. */
  decimals?: number;
  emptyMessage?: string;
}) {
  const conDato = rows.filter(
    (row): row is DivergingRow & { value: number } => row.value !== null,
  );
  if (conDato.length === 0) {
    return <EmptyState message={emptyMessage ?? 'Sin datos para comparar.'} />;
  }

  // Escala simétrica: si un lado se midiera contra su propio máximo, un −3 y un +12 se
  // verían igual de largos y el gráfico mentiría sobre cuál pesa más.
  const tope = Math.max(...conDato.map((row) => Math.abs(row.value)), 1);
  const ordenadas = [...conDato].sort((a, b) => a.value - b.value);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3 text-xs font-medium whitespace-nowrap text-foreground-muted sm:pr-16 sm:pl-[13.75rem]">
        <span className="flex items-center gap-1.5 text-foreground-muted">
          <span aria-hidden className="size-2.5 rounded-sm bg-diverge-neg" />
          {negativeLabel}
        </span>
        <span className="flex items-center gap-1.5 text-foreground-muted">
          {positiveLabel}
          <span aria-hidden className="size-2.5 rounded-sm bg-diverge-pos" />
        </span>
      </div>

      <ul className="flex flex-col gap-1.5">
        {ordenadas.map((row, index) => {
          const share = (Math.abs(row.value) / tope) * 50;
          const negativa = row.value < 0;

          return (
            <li key={row.key} className="flex items-center gap-3">
              <span className="w-28 shrink-0 truncate text-[13px] text-foreground sm:w-52" title={row.label}>
                {row.label}
              </span>

              <span className="relative h-6 flex-1" title={row.hint ?? row.label}>
                {/* La línea del cero, siempre visible: sin ella no hay contra qué leer. */}
                <span
                  aria-hidden
                  className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-[var(--chart-benchmark)] opacity-40"
                />
                <span
                  className={`lk-graf-barra absolute top-1/2 h-3 -translate-y-1/2 ${negativa ? 'rounded-l' : 'rounded-r'}`}
                  style={{
                    ...stagger(index),
                    transformOrigin: negativa ? 'right center' : 'left center',
                    width: `${Math.max(share, 0.6)}%`,
                    [negativa ? 'right' : 'left']: '50%',
                    backgroundColor: negativa
                      ? 'var(--diverge-neg)'
                      : 'var(--diverge-pos)',
                  }}
                />
              </span>

              <span className="w-14 shrink-0 text-right text-[13px] font-semibold tabular-nums text-foreground">
                {formatSigned(row.value, decimals)}
                {unit}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
