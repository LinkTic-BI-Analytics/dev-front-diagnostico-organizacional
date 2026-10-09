'use client';

import { Fragment, useState } from 'react';
import clsx from 'clsx';
import type { MonitoringPayload } from '@/lib/admin.types';
import { formatCount, formatShare } from '@/lib/score-scale';
import { SURVEY_PHASES, phaseOfComponent } from '@/components/survey/survey-phases';
import { ChartTooltip, TooltipRow, niceTicks, stagger, useMeasure } from './chart-utils';
import { EmptyState } from './InsufficientData';
import { roundedTop } from './TimelineChart';

/* ================================================================ embudo */

export interface FunnelRow {
  key: string;
  label: string;
  value: number;
  /** El bloque de la encuesta al que pertenece el paso, para agrupar las filas. */
  phaseId?: string;
}

/**
 * Hasta dónde llega la gente: cuántas encuestas alcanzan cada componente.
 *
 * Es un embudo y no un ranking, así que conserva el orden del instrumento —el orden es el
 * dato— y mide todo contra las que se abrieron. Las filas se agrupan por bloque, que es
 * como el encuestado vive la encuesta, y la caída más grande va señalada: es la pantalla
 * que conviene revisar primero.
 */
export function FunnelBars({ rows }: { rows: FunnelRow[] }) {
  const base = rows[0]?.value ?? 0;
  if (base === 0) return <EmptyState message="Todavía no se ha abierto ninguna encuesta." />;

  let worst = { index: -1, drop: 0 };
  rows.forEach((row, index) => {
    if (index === 0) return;
    const drop = rows[index - 1].value - row.value;
    if (drop > worst.drop) worst = { index, drop };
  });

  return (
    <ol className="flex flex-col gap-1">
      {rows.map((row, index) => {
        const share = (row.value / base) * 100;
        const previousPhase = rows[index - 1]?.phaseId;
        const phase = row.phaseId ? SURVEY_PHASES.find((entry) => entry.id === row.phaseId) : null;
        const newPhase = phase && row.phaseId !== previousPhase;
        const isWorst = index === worst.index;

        return (
          <Fragment key={row.key}>
            {newPhase && (
              <li
                aria-hidden
                data-phase={phase.id}
                className="mt-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-phase first:mt-0"
              >
                <span className="h-0.5 w-3 rounded-full bg-phase-accent" />
                Bloque {phase.order} · {phase.name}
              </li>
            )}
            <li className="flex flex-col gap-1.5 py-1 sm:grid sm:grid-cols-[minmax(10rem,15rem)_minmax(0,1fr)_7.5rem] sm:items-center sm:gap-4">
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-[13px] text-foreground" title={row.label}>
                  {row.label}
                </span>
                {isWorst && (
                  <span className="text-xs font-medium text-tone-warn">
                    −{worst.drop} {worst.drop === 1 ? 'encuesta' : 'encuestas'} frente al paso anterior
                  </span>
                )}
              </span>
              <span className="flex items-center gap-3 sm:contents">
                <span className="relative h-3.5 min-w-0 flex-1 rounded-r bg-surface-muted">
                  <span
                    className="lk-graf-barra absolute inset-y-0 left-0 rounded-r"
                    style={{
                      width: `${Math.max(share, row.value > 0 ? 1 : 0)}%`,
                      backgroundColor: index === 0 ? 'var(--seq-200)' : isWorst ? 'var(--seq-600)' : 'var(--series-1)',
                      ...stagger(index, 0.03),
                    }}
                  />
                </span>
                <span className="shrink-0 text-right text-[13px] tabular-nums">
                  <span className="font-semibold text-foreground">{formatCount(row.value)}</span>
                  <span className="text-foreground-subtle"> · {formatShare(share, 0)}</span>
                </span>
              </span>
            </li>
          </Fragment>
        );
      })}
    </ol>
  );
}

/** Las filas del embudo a partir del payload: abiertas, cada componente y enviadas. */
export function funnelRows(payload: MonitoringPayload): FunnelRow[] {
  return [
    { key: 'abiertas', label: 'Abrieron la encuesta', value: payload.totals.started },
    ...payload.funnel.map((step) => ({
      key: `c${step.componentId}`,
      label: `${step.componentId}. ${step.title}`,
      value: step.reached,
      phaseId: phaseOfComponent(step.componentId)?.id,
    })),
    { key: 'enviadas', label: 'Enviaron la encuesta', value: payload.totals.completed },
  ];
}

/* ================================================================ duración */

/**
 * Cuánto tardan quienes terminan, contra los 15 minutos que promete el instrumento.
 *
 * Histograma y no promedio: un promedio de 14 minutos puede ser todos en 14 o la mitad en
 * 3 y la otra mitad en 25, y la segunda es una encuesta que se está contestando a la
 * carrera. La línea marca la promesa, no una meta: tardar más no es malo en sí.
 */
export function DurationHistogram({
  buckets,
  height = 240,
}: {
  buckets: MonitoringPayload['durations'];
  height?: number;
}) {
  const { ref, width } = useMeasure<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const total = buckets.reduce((sum, bucket) => sum + bucket.count, 0);

  if (total === 0) {
    return <EmptyState message="Todavía no hay encuestas terminadas con duración registrada." />;
  }

  const margin = { top: 22, right: 8, bottom: 30, left: 32 };
  const innerWidth = Math.max(width - margin.left - margin.right, 10);
  const innerHeight = height - margin.top - margin.bottom;
  const ticks = niceTicks(Math.max(...buckets.map((bucket) => bucket.count)), 3);
  const top = ticks[ticks.length - 1];
  const band = innerWidth / buckets.length;
  const columnWidth = Math.min(28, band * 0.62);
  const yAt = (value: number) => margin.top + innerHeight - (value / top) * innerHeight;
  const promiseIndex = buckets.findIndex((bucket) => bucket.minSeconds >= 900);

  return (
    <div ref={ref} className="relative w-full" style={{ height }}>
      {width > 0 && (
        <svg width={width} height={height} className="block overflow-visible" aria-hidden="true">
          {ticks.map((tick) => (
            <g key={tick}>
              <line
                x1={margin.left}
                x2={margin.left + innerWidth}
                y1={yAt(tick)}
                y2={yAt(tick)}
                stroke={tick === 0 ? 'var(--chart-axis)' : 'var(--chart-grid)'}
              />
              <text x={margin.left - 8} y={yAt(tick) + 4} textAnchor="end" fontSize={11} fill="var(--chart-ink)">
                {tick}
              </text>
            </g>
          ))}

          {promiseIndex > 0 && (
            <g>
              <line
                x1={margin.left + promiseIndex * band}
                x2={margin.left + promiseIndex * band}
                y1={margin.top - 6}
                y2={yAt(0)}
                stroke="var(--chart-benchmark)"
                strokeWidth={1.5}
              />
              <text
                x={margin.left + promiseIndex * band + 6}
                y={margin.top - 8}
                fontSize={11}
                fill="var(--foreground-muted)"
              >
                Estimado: 15 min
              </text>
            </g>
          )}

          {buckets.map((bucket, index) => {
            const x = margin.left + index * band + (band - columnWidth) / 2;
            const y = yAt(bucket.count);
            return (
              <g
                key={bucket.label}
                onPointerEnter={() => setHover(index)}
                onPointerLeave={() => setHover(null)}
              >
                <rect x={margin.left + index * band} y={margin.top} width={band} height={innerHeight} fill="transparent" />
                {bucket.count > 0 && (
                  <path
                    className="lk-graf-columna"
                    style={stagger(index, 0.05)}
                    d={roundedTop(x, y, columnWidth, yAt(0) - y, 4)}
                    fill="var(--series-1)"
                    opacity={hover === null || hover === index ? 1 : 0.55}
                  />
                )}
                {bucket.count > 0 && (
                  <text x={x + columnWidth / 2} y={y - 6} textAnchor="middle" fontSize={11} fontWeight={600} fill="var(--foreground)">
                    {bucket.count}
                  </text>
                )}
                <text
                  x={margin.left + index * band + band / 2}
                  y={height - 9}
                  textAnchor="middle"
                  fontSize={width < 420 ? 9.5 : 11}
                  fill="var(--chart-ink)"
                >
                  {bucket.label.replace(' min', '')}
                </text>
              </g>
            );
          })}
        </svg>
      )}
      {hover !== null && (
        <ChartTooltip
          x={margin.left + hover * band + band / 2}
          y={yAt(buckets[hover].count) - 10}
          containerWidth={width}
        >
          <TooltipRow color="var(--series-1)" value={buckets[hover].count} label={buckets[hover].count === 1 ? 'encuesta' : 'encuestas'} />
          <p className="mt-0.5 text-slate-300">
            {buckets[hover].label} · {formatShare((buckets[hover].count / total) * 100, 0)} de las terminadas
          </p>
        </ChartTooltip>
      )}
    </div>
  );
}

/* ================================================================ calendario */

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const WEEKDAYS_LONG = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
const HEAT_STEPS = ['var(--seq-200)', 'var(--seq-300)', 'var(--seq-400)', 'var(--seq-500)', 'var(--seq-700)'];

/**
 * Cuándo responde la gente: envíos por día de la semana y hora (hora de Bogotá).
 *
 * Sirve para decidir cuándo mandar el siguiente recordatorio: la convocatoria rinde más
 * si llega justo antes de la franja en la que la gente ya está respondiendo. Rampa de un
 * solo tono (magnitud), con el cero en gris para que «nadie» no se confunda con «poco».
 */
export function ActivityHeatmap({ cells }: { cells: MonitoringPayload['heatmap'] }) {
  const [hover, setHover] = useState<{ weekday: number; hour: number } | null>(null);
  const byKey = new Map(cells.map((cell) => [`${cell.weekday}-${cell.hour}`, cell.completed]));
  const max = Math.max(...cells.map((cell) => cell.completed), 0);

  if (max === 0) return <EmptyState message="Todavía no hay envíos para ubicar en el calendario." />;

  const stepOf = (value: number) =>
    value === 0 ? -1 : Math.min(HEAT_STEPS.length - 1, Math.floor(((value - 0.0001) / max) * HEAT_STEPS.length));

  const hoverValue = hover ? (byKey.get(`${hover.weekday}-${hover.hour}`) ?? 0) : 0;

  return (
    <div className="flex flex-col gap-3">
      <div className="relative -mx-1 overflow-x-auto px-1">
        <div
          role="table"
          aria-label="Encuestas enviadas por día de la semana y hora"
          className="grid min-w-[560px] gap-[3px]"
          style={{ gridTemplateColumns: '2.5rem repeat(24, minmax(0, 1fr))' }}
        >
          <div role="row" className="contents">
            <span role="columnheader" />
            {Array.from({ length: 24 }, (_, hour) => (
              <span
                key={hour}
                role="columnheader"
                className="text-center text-[10px] text-foreground-subtle tabular-nums"
              >
                {hour % 3 === 0 ? hour : <span className="sr-only">{hour}</span>}
              </span>
            ))}
          </div>
          {WEEKDAYS.map((day, weekday) => (
            <div role="row" key={day} className="contents">
              <span role="rowheader" className="flex items-center text-xs text-foreground-muted">
                {day}
              </span>
              {Array.from({ length: 24 }, (_, hour) => {
                const value = byKey.get(`${weekday}-${hour}`) ?? 0;
                const step = stepOf(value);
                const active = hover?.weekday === weekday && hover.hour === hour;
                return (
                  <span
                    key={hour}
                    role="cell"
                    aria-label={`${WEEKDAYS_LONG[weekday]} a las ${hour}:00: ${value} ${value === 1 ? 'envío' : 'envíos'}`}
                    onPointerEnter={() => setHover({ weekday, hour })}
                    onPointerLeave={() => setHover(null)}
                    className={clsx(
                      'lk-graf-celda h-6 rounded-[4px] transition-shadow sm:h-7',
                      active && 'ring-2 ring-navy-900 ring-offset-1',
                    )}
                    style={{
                      backgroundColor: step < 0 ? 'var(--chart-empty)' : HEAT_STEPS[step],
                      ...stagger(weekday * 24 + hour, 0.002, 0.3),
                    }}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-foreground-muted">
        <p aria-live="polite" className="min-h-4">
          {hover
            ? `${WEEKDAYS_LONG[hover.weekday].replace(/^./, (c) => c.toUpperCase())}, ${hover.hour}:00–${hover.hour}:59 · ${hoverValue} ${hoverValue === 1 ? 'envío' : 'envíos'}`
            : 'Pase el cursor por una celda para ver el detalle.'}
        </p>
        <span className="flex items-center gap-1.5">
          Menos
          <span aria-hidden className="size-3 rounded-[3px]" style={{ backgroundColor: 'var(--chart-empty)' }} />
          {HEAT_STEPS.map((color) => (
            <span key={color} aria-hidden className="size-3 rounded-[3px]" style={{ backgroundColor: color }} />
          ))}
          Más
        </span>
      </div>
    </div>
  );
}

export { WEEKDAYS_LONG };
