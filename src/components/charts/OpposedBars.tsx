import type { CountedOption } from '@/lib/admin.types';
import { formatShare } from '@/lib/score-scale';
import { EmptyState } from './InsufficientData';

/**
 * Los mismos motivos, a los dos lados: por qué recomiendan y por qué no.
 *
 * Puestos en dos listas separadas hay que ir y venir para ver si un motivo aparece en las
 * dos. Enfrentados, la coincidencia es la primera cosa que se ve — y esa coincidencia es
 * la lectura más útil del componente: el mismo atributo vivido al revés según el área.
 *
 * Los dos lados NO van en verde y rojo. Ese par se derrumba con deuteranopia (ΔE 4,5),
 * así que el color estaría fingiendo informar. Van en el par divergente azul/rojo
 * verificado (ΔE 21,6 con protanopia), y quien dice cuál es cuál es la palabra del
 * encabezado.
 */
export function OpposedBars({
  promoters,
  detractors,
  emptyMessage,
  leftLabel = 'Detractores',
  rightLabel = 'Promotores',
  format = (share: number) => formatShare(share, 0),
  bothNote = 'En negrita, los motivos que pesan en los dos lados a la vez.',
  bothThreshold = 15,
}: {
  /** El lado derecho (positivo). */
  promoters: CountedOption[];
  /** El lado izquierdo (negativo). */
  detractors: CountedOption[];
  emptyMessage?: string;
  leftLabel?: string;
  rightLabel?: string;
  /** Cómo se escribe cada valor: porcentaje por defecto, conteo para menciones. */
  format?: (value: number) => string;
  bothNote?: string;
  /** Desde qué valor un elemento «pesa» en un lado: 15 % para motivos, 2 menciones para conteos. */
  bothThreshold?: number;
}) {
  const porValor = new Map<string, { label: string; pro: number; det: number }>();
  for (const option of promoters) {
    porValor.set(option.value, { label: option.label, pro: option.share, det: 0 });
  }
  for (const option of detractors) {
    const previo = porValor.get(option.value);
    if (previo) previo.det = option.share;
    else porValor.set(option.value, { label: option.label, pro: 0, det: option.share });
  }

  const filas = [...porValor.entries()]
    .map(([value, row]) => ({ value, ...row }))
    .sort((a, b) => b.pro + b.det - (a.pro + a.det));

  if (filas.length === 0) {
    return <EmptyState message={emptyMessage ?? 'Sin motivos registrados todavía.'} />;
  }

  const tope = Math.max(...filas.flatMap((row) => [row.pro, row.det]), 1);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3 text-xs font-medium">
        <span className="flex flex-1 items-center justify-end gap-1.5 text-foreground-muted">
          <span aria-hidden className="size-2.5 rounded-sm bg-diverge-neg" />
          {leftLabel}
        </span>
        <span className="w-28 shrink-0 sm:w-40" />
        <span className="flex flex-1 items-center gap-1.5 text-foreground-muted">
          <span aria-hidden className="size-2.5 rounded-sm bg-diverge-pos" />
          {rightLabel}
        </span>
      </div>

      <ul className="flex flex-col gap-2">
        {filas.map((row) => {
          const ambos = row.pro >= bothThreshold && row.det >= bothThreshold;
          return (
            <li key={row.value} className="flex items-center gap-3">
              <span className="flex flex-1 items-center justify-end gap-2">
                <span className="text-xs tabular-nums text-foreground-muted">
                  {row.det > 0 ? format(row.det) : ''}
                </span>
                <span className="relative h-5 flex-1">
                  <span
                    className="absolute right-0 top-1/2 h-3 -translate-y-1/2 rounded-l bg-diverge-neg"
                    style={{ width: `${(row.det / tope) * 100}%` }}
                  />
                </span>
              </span>

              <span
                className={[
                  'w-28 shrink-0 truncate text-center text-[13px] sm:w-40',
                  ambos ? 'font-bold text-foreground' : 'text-foreground',
                ].join(' ')}
                title={ambos ? `${row.label} — aparece con fuerza en los dos lados` : row.label}
              >
                {row.label}
              </span>

              <span className="flex flex-1 items-center gap-2">
                <span className="relative h-5 flex-1">
                  <span
                    className="absolute left-0 top-1/2 h-3 -translate-y-1/2 rounded-r bg-diverge-pos"
                    style={{ width: `${(row.pro / tope) * 100}%` }}
                  />
                </span>
                <span className="text-xs tabular-nums text-foreground-muted">
                  {row.pro > 0 ? format(row.pro) : ''}
                </span>
              </span>
            </li>
          );
        })}
      </ul>

      <p className="text-xs text-foreground-subtle">
        {bothNote}
      </p>
    </div>
  );
}
