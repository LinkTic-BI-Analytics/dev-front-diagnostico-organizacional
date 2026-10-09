import Link from 'next/link';
import type { ThresholdBand } from '@/lib/admin.types';
import { classify, formatIndex } from '@/lib/score-scale';
import { stagger } from './chart-utils';
import { EmptyState } from './InsufficientData';

export interface BarRow {
  key: string;
  label: string;
  value: number | null;
  /**
   * Número a mostrar cuando NO coincide con el que dibuja la barra. Lo necesita el NPS:
   * la barra tiene que medir sobre una escala 0-100 porque no puede dibujar un valor
   * negativo, pero el número que se lee debe ser el NPS real, de −100 a +100.
   */
  display?: string;
  /** Texto secundario, p. ej. el número de respuestas que sostienen la fila. */
  hint?: string;
  /** Valor de referencia en la misma escala (el promedio de la empresa): una marca vertical. */
  benchmark?: number | null;
  /** Color propio de la barra, para destacar una fila (énfasis) frente al resto en gris. */
  color?: string;
}

interface Props {
  rows: BarRow[];
  /** Presente cuando los valores son índices 0-100 y llevan banda semafórica. */
  bands?: ThresholdBand[];
  /** Máximo del eje. Fijo en 100 para índices; calculado para conteos. */
  max?: number;
  emptyMessage?: string;
  /** Sufijo del valor, p. ej. "%" para porcentajes. */
  suffix?: string;
  href?: (row: BarRow) => string;
  /** Ancho de la columna de etiquetas en escritorio. */
  labelWidth?: string;
}

/**
 * Barras horizontales.
 *
 * Horizontales porque las etiquetas son nombres de área y de opción: en vertical habría
 * que rotarlas o truncarlas, y el nombre es justo lo que el lector necesita. Barra fina
 * con el extremo redondeado y la base recta, sobre una pista con las cuartas partes
 * marcadas: sin las marcas, un 62 y un 58 se ven iguales.
 *
 * Una sola serie va en el tono 1. Cuando los valores son índices con banda, la barra lleva
 * el color del semáforo y la palabra de la banda va escrita al lado: el color acompaña,
 * no informa solo.
 */
export function BarRanking({ rows, bands, max, emptyMessage, suffix, href, labelWidth = '15rem' }: Props) {
  if (rows.length === 0) {
    return <EmptyState message={emptyMessage ?? 'Sin datos para mostrar.'} />;
  }

  const ceiling = max ?? Math.max(...rows.map((row) => Math.max(row.value ?? 0, row.benchmark ?? 0)), 1);

  return (
    <ul
      className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-2.5 sm:[grid-template-columns:var(--lk-label)_minmax(0,1fr)_auto]"
      style={{ ['--lk-label' as string]: `minmax(8rem, ${labelWidth})` }}
    >
      {rows.map((row, index) => {
        const band = bands ? classify(row.value, bands) : null;
        const width = row.value === null ? 0 : Math.max((row.value / ceiling) * 100, 1.2);
        const benchmark =
          row.benchmark === null || row.benchmark === undefined
            ? null
            : Math.min((row.benchmark / ceiling) * 100, 100);

        return (
          <li key={row.key} className="col-span-full grid grid-cols-subgrid items-center gap-y-1.5">
            <span className="min-w-0 text-sm leading-snug text-foreground">
              {href ? (
                <Link href={href(row)} className="text-brand underline-offset-4 hover:underline">
                  {row.label}
                </Link>
              ) : (
                row.label
              )}
              {row.hint && <span className="block text-xs text-foreground-subtle">{row.hint}</span>}
            </span>

            <span
              className="relative order-last col-span-full h-3 sm:order-none sm:col-span-1"
              title={`${row.label}: ${row.display ?? formatIndex(row.value, suffix === '%' ? 1 : 0)}${row.display ? '' : (suffix ?? '')}`}
            >
              {/* Pista con las cuartas partes: la referencia para leer sin el número. */}
              <span aria-hidden className="absolute inset-0 rounded-r bg-surface-muted" />
              {[25, 50, 75].map((tick) => (
                <span
                  key={tick}
                  aria-hidden
                  className="absolute inset-y-0 w-px bg-white"
                  style={{ left: `${tick}%` }}
                />
              ))}
              <span
                className="lk-graf-barra absolute inset-y-0 left-0 rounded-r"
                style={{
                  width: `${width}%`,
                  backgroundColor: row.color ?? band?.color ?? 'var(--series-1)',
                  ...stagger(index),
                }}
              />
              {benchmark !== null && (
                <span
                  aria-hidden
                  className="absolute -inset-y-1 w-0.5 -translate-x-1/2 rounded-full bg-[var(--chart-benchmark)]"
                  style={{ left: `${benchmark}%` }}
                />
              )}
            </span>

            <span className="flex items-baseline justify-end gap-2 text-right whitespace-nowrap">
              <span className="text-sm font-semibold tabular-nums text-foreground">
                {row.display ?? (
                  <>
                    {formatIndex(row.value, suffix === '%' ? 1 : 0)}
                    {suffix && ` ${suffix}`}
                  </>
                )}
              </span>
              {band && <span className="text-xs text-foreground-subtle">{band.label}</span>}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
