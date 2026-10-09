'use client';

import clsx from 'clsx';
import type { InfluenceEdge, InfluenceLevel, InfluenceNode, ThresholdBand } from '@/lib/admin.types';
import { ZONE_LABELS, isLowScore, type InfluenceUnit } from '@/lib/insights';
import { classify, formatIndex } from '@/lib/score-scale';
import { EmptyState } from './InsufficientData';

/** Un paso de la rampa secuencial por fuerza: más oscuro, más fuerte. */
const FILLS: Record<1 | 2 | 3, { background: string; ink: string }> = {
  1: { background: 'var(--seq-200)', ink: '#0d366b' },
  2: { background: 'var(--seq-400)', ink: '#ffffff' },
  3: { background: 'var(--seq-700)', ink: '#ffffff' },
};
const STRENGTH_LABEL = { 1: 'débil', 2: 'media', 3: 'fuerte' } as const;
const HATCH = 'repeating-linear-gradient(135deg, var(--chart-axis) 0 1px, transparent 1px 5px)';

/**
 * La matriz de influencias, nodo a nodo: cada fila mueve a las columnas.
 *
 * Es la forma del análisis estructural: en el margen derecho, cuánto mueve cada uno
 * (motricidad); al pie, cuánto lo mueven (dependencia). Una celda con borde rojo es una
 * relación que quien depende califica por debajo de lo aceptable.
 */
export function InfluenceMatrix({
  level,
  bands,
  numbers,
  unit,
}: {
  level: InfluenceLevel;
  bands: ThresholdBand[];
  numbers: Map<string, number>;
  unit: InfluenceUnit;
}) {
  if (level.nodes.length === 0) {
    return <EmptyState message={`Todavía no hay relaciones entre ${unit.many}.`} />;
  }

  const edges = new Map(level.edges.map((edge) => [`${edge.from} ${edge.to}`, edge]));
  const names = new Map(level.nodes.map((node) => [node.code, node.name]));
  const hasLow = level.edges.some((edge) => isLowScore(edge.irel, bands));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[12.5px] text-foreground-muted">
        <span className="flex items-center gap-1.5">
          Fuerza
          {([1, 2, 3] as const).map((strength) => (
            <span
              key={strength}
              aria-hidden
              className="grid size-5 place-items-center rounded-[4px] text-[11px] font-semibold"
              style={{ backgroundColor: FILLS[strength].background, color: FILLS[strength].ink }}
            >
              {strength}
            </span>
          ))}
          <span className="sr-only">de 1, débil, a 3, fuerte</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="size-4 rounded-[4px] border border-border-subtle" style={{ backgroundImage: HATCH }} />
          Sin relación visible
        </span>
        {hasLow && (
          <span className="flex items-center gap-1.5">
            <span aria-hidden className="size-4 rounded-[4px] bg-[var(--seq-400)] shadow-[inset_0_0_0_2px_var(--tone-bad)]" />
            Calificada bajo lo aceptable
          </span>
        )}
      </div>

      <div className="relative -mx-1 overflow-x-auto px-1 pb-1">
        <table className="border-separate border-spacing-[3px] text-[12px]">
          <caption className="sr-only">
            Matriz de influencias: cada fila mueve a las columnas; la fuerza va de 1 a 3
          </caption>
          <thead>
            <tr>
              <th
                scope="col"
                className="pr-3 pb-1 text-left text-[11px] font-semibold tracking-[0.1em] text-foreground-subtle uppercase"
              >
                Mueve a →
              </th>
              {level.nodes.map((node) => (
                <th key={node.code} scope="col" className="w-7 pb-1 text-center text-[11px] font-medium text-foreground-muted">
                  <abbr title={node.name} className="no-underline">
                    #{numbers.get(node.code)}
                  </abbr>
                </th>
              ))}
              <th
                scope="col"
                className="pb-1 pl-3 text-right text-[11px] font-semibold tracking-[0.1em] text-foreground-subtle uppercase"
              >
                Motricidad
              </th>
            </tr>
          </thead>
          <tbody>
            {level.nodes.map((row) => (
              <tr key={row.code}>
                <th
                  scope="row"
                  title={`${row.name} · ${ZONE_LABELS[row.zone].toLowerCase()}`}
                  className="max-w-60 truncate pr-3 text-left font-normal text-foreground"
                >
                  <b className="font-semibold">#{numbers.get(row.code)}</b> {row.name}
                </th>
                {level.nodes.map((column) => (
                  <Cell
                    key={column.code}
                    row={row}
                    column={column}
                    edge={edges.get(`${row.code} ${column.code}`)}
                    names={names}
                    bands={bands}
                  />
                ))}
                <td className="pl-3 text-right font-semibold text-foreground tabular-nums">{row.motricidad}</td>
              </tr>
            ))}
            <tr>
              <th
                scope="row"
                className="pt-1 pr-3 text-left text-[11px] font-semibold tracking-[0.1em] text-foreground-subtle uppercase"
              >
                Dependencia
              </th>
              {level.nodes.map((column) => (
                <td
                  key={column.code}
                  className={clsx(
                    'pt-1 text-center tabular-nums',
                    column.grantedBy === 0 ? 'text-foreground-subtle' : 'text-foreground-muted',
                  )}
                  title={column.grantedBy === 0 ? 'Sin medir: nadie de ella evaluó a otras' : undefined}
                >
                  {column.grantedBy === 0 ? '·' : column.dependencia}
                </td>
              ))}
              <td />
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Cell({
  row,
  column,
  edge,
  names,
  bands,
}: {
  row: InfluenceNode;
  column: InfluenceNode;
  edge: InfluenceEdge | undefined;
  names: Map<string, string>;
  bands: ThresholdBand[];
}) {
  if (row.code === column.code) {
    return <td aria-hidden className="size-7 rounded-[4px] bg-[var(--chart-empty)]" />;
  }
  if (!edge) {
    return (
      <td
        title={`${row.name} → ${column.name}: sin relación visible`}
        className="size-7 rounded-[4px] border border-border-subtle"
        style={{ backgroundImage: HATCH }}
      >
        <span className="sr-only">sin relación visible</span>
      </td>
    );
  }
  const fill = FILLS[edge.strength];
  const low = isLowScore(edge.irel, bands);
  const band = classify(edge.irel, bands);
  const label = `${names.get(edge.to)} depende de ${names.get(edge.from)}: fuerza ${STRENGTH_LABEL[edge.strength]}, ${edge.respondents} personas${edge.irel !== null ? `, relacionamiento ${formatIndex(edge.irel, 1)}${band ? ` (${band.label})` : ''}` : ''}`;
  return (
    <td
      title={label}
      className="lk-graf-celda size-7 rounded-[4px] text-center text-[11px] font-semibold tabular-nums"
      style={{
        backgroundColor: fill.background,
        color: fill.ink,
        boxShadow: low ? 'inset 0 0 0 2px var(--tone-bad)' : undefined,
      }}
    >
      {edge.strength}
      <span className="sr-only">. {label}</span>
    </td>
  );
}
