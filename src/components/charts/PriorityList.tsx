import Link from 'next/link';
import type { Tone } from '@/lib/insights';
import type { RadarPoint } from '@/lib/admin.types';
import { formatIndex } from '@/lib/score-scale';
import { Icon } from '@/components/ui/icons';

export interface PriorityItem {
  point: RadarPoint & { value: number };
  tone: Tone;
  action?: string;
}

/**
 * Las prioridades como fichas, con lo que habría que hacer con cada una.
 *
 * Un panel que termina en un número deja el trabajo a medias: alguien tiene que traducirlo
 * a una decisión, y esa traducción es donde se pierde el diagnóstico. La acción sugerida
 * no reemplaza el criterio de gerencia, pero le da un punto de partida concreto. El orden
 * va escrito (#1, #2…) porque es el dato: qué se ataca primero.
 */
export function PriorityCards({
  items,
  href,
  emptyMessage,
}: {
  items: PriorityItem[];
  href?: string;
  emptyMessage?: string;
}) {
  if (items.length === 0) {
    return <p className="text-sm text-foreground-muted">{emptyMessage ?? 'Sin índices con dato suficiente.'}</p>;
  }

  return (
    <ol className="lk-escalonado grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {items.map(({ point, action }, index) => {
        const body = (
          <>
            <div className="flex items-center justify-between gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-muted px-2.5 py-1 text-xs font-semibold text-foreground">
                <span
                  aria-hidden
                  className="size-2 rounded-full"
                  style={{ backgroundColor: point.band?.color ?? 'var(--border-strong)' }}
                />
                #{index + 1}
              </span>
              {href && <Icon name="arrowUpRight" size={16} className="text-foreground-subtle" />}
            </div>
            <p className="text-[15px] font-semibold leading-snug text-foreground">{point.label}</p>
            <p className="flex flex-wrap items-baseline gap-x-2">
              <span className="text-3xl font-semibold tracking-tight text-foreground">
                {formatIndex(point.value, 1)}
              </span>
              <span className="text-sm text-foreground-muted">de 100</span>
            </p>
            <span className="-mt-1 text-xs font-medium text-foreground-muted">
              {point.band?.label ?? 'Sin banda'}
            </span>
            {action && <p className="mt-auto text-[13px] leading-relaxed text-foreground-muted">{action}</p>}
          </>
        );

        return (
          <li key={point.code} className="flex">
            {href ? (
              <Link
                href={`${href}#${point.code}`}
                className="lk-tarjeta flex w-full flex-col gap-3 p-5 transition-shadow hover:shadow-[0_0_0_1px_#0e8fd855,0_14px_32px_-18px_#0a6cb166]"
              >
                {body}
              </Link>
            ) : (
              <div className="lk-tarjeta flex w-full flex-col gap-3 p-5">{body}</div>
            )}
          </li>
        );
      })}
    </ol>
  );
}

/**
 * La lista compacta de lo que sostiene (o no) el diagnóstico, para la columna lateral:
 * punto de banda, nombre y cifra, en una línea cada uno.
 */
export function PointList({ items }: { items: PriorityItem[] }) {
  return (
    <ul className="flex flex-col divide-y divide-border-subtle">
      {items.map(({ point }) => (
        <li key={point.code} className="flex items-start gap-2.5 py-2.5 first:pt-0 last:pb-0">
          <span
            aria-hidden
            className="mt-1.5 size-2 shrink-0 rounded-full"
            style={{ backgroundColor: point.band?.color ?? 'var(--border-strong)' }}
          />
          <span className="flex min-w-0 flex-col">
            <span className="text-sm text-foreground">{point.label}</span>
            <span className="text-xs text-foreground-subtle">
              {formatIndex(point.value, 1)} · {point.band?.label ?? 'sin banda'}
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}
