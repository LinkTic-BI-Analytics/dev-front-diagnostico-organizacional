'use client';

import { useState } from 'react';
import type { MonitoringPayload } from '@/lib/admin.types';
import { formatCount } from '@/lib/score-scale';
import { ChartTooltip, TooltipRow, niceTicks, stagger, useMeasure } from './chart-utils';
import { EmptyState } from './InsufficientData';

type Day = MonitoringPayload['timeline'][number];

const COMPLETED = 'var(--series-1)';
/** Las iniciadas son contexto, no la historia: van en el gris de desénfasis. */
const STARTED = '#90a1b9';

/** «2026-09-14» → «14 sept». Se arma con las partes para no correr el día por zona horaria. */
export function formatDay(date: string, withYear = false): string {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'short',
    ...(withYear ? { year: 'numeric' } : {}),
  });
}

/**
 * Cómo avanza la recolección, día por día.
 *
 * Acumulado es la vista por defecto porque contesta la pregunta del monitoreo —¿vamos
 * llegando?—, y la distancia entre las dos curvas es el abandono, visible sin restar. La
 * vista diaria contesta otra cosa: si la convocatoria sigue moviendo gente o ya se apagó.
 *
 * Un solo eje: las dos series son conteos de lo mismo (encuestas), en la misma escala.
 */
export function TimelineChart({
  days,
  mode,
  population,
  height = 300,
}: {
  days: Day[];
  mode: 'cumulative' | 'daily';
  population: number | null;
  height?: number;
}) {
  const { ref, width } = useMeasure<HTMLDivElement>();
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  if (days.length === 0) {
    return <EmptyState message="Todavía no se ha abierto ninguna encuesta." />;
  }

  const margin = { top: 18, right: mode === 'cumulative' ? 96 : 12, bottom: 30, left: 40 };
  const innerWidth = Math.max(width - margin.left - margin.right, 10);
  const innerHeight = height - margin.top - margin.bottom;

  const peak =
    mode === 'cumulative'
      ? Math.max(...days.map((day) => day.cumulativeStarted), population ?? 0, 1)
      : Math.max(...days.map((day) => Math.max(day.completed, day.started)), 1);
  const ticks = niceTicks(peak, 4);
  const top = ticks[ticks.length - 1];

  const step = days.length > 1 ? innerWidth / (days.length - 1) : 0;
  const xAt = (index: number) =>
    margin.left + (days.length > 1 ? index * step : innerWidth / 2);
  const yAt = (value: number) => margin.top + innerHeight - (value / top) * innerHeight;
  const baseline = yAt(0);

  const linePath = (pick: (day: Day) => number) =>
    days.map((day, index) => `${index === 0 ? 'M' : 'L'}${xAt(index)},${yAt(pick(day))}`).join(' ');

  const completedLine = linePath((day) => day.cumulativeCompleted);
  const startedLine = linePath((day) => day.cumulativeStarted);
  const completedArea = `${completedLine} L${xAt(days.length - 1)},${baseline} L${xAt(0)},${baseline} Z`;

  const last = days[days.length - 1];
  const tickEvery = Math.max(1, Math.ceil(days.length / Math.max(Math.floor(innerWidth / 90), 2)));
  const columnWidth = Math.min(24, Math.max((innerWidth / days.length) * 0.6, 3));

  function handlePointer(event: React.PointerEvent<SVGRectElement>) {
    const box = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - box.left;
    const index = days.length > 1 ? Math.round(x / step) : 0;
    setHoverIndex(Math.min(Math.max(index, 0), days.length - 1));
  }

  const hovered = hoverIndex !== null ? days[hoverIndex] : null;

  // Las dos etiquetas finales se separan si las curvas terminan casi juntas.
  const endCompleted = yAt(last.cumulativeCompleted);
  let endStarted = yAt(last.cumulativeStarted);
  if (Math.abs(endCompleted - endStarted) < 16) endStarted = endCompleted - 16;

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
              <text
                x={margin.left - 8}
                y={yAt(tick) + 4}
                textAnchor="end"
                fontSize={11}
                fill="var(--chart-ink)"
                className="tabular-nums"
              >
                {formatCount(tick)}
              </text>
            </g>
          ))}

          {days.map((day, index) =>
            index % tickEvery === 0 || index === days.length - 1 ? (
              <text
                key={day.date}
                x={xAt(index)}
                y={height - 8}
                textAnchor={index === 0 && days.length > 1 ? 'start' : index === days.length - 1 && days.length > 1 ? 'end' : 'middle'}
                fontSize={11}
                fill="var(--chart-ink)"
              >
                {formatDay(day.date)}
              </text>
            ) : null,
          )}

          {mode === 'cumulative' && population !== null && population <= top && (
            <g>
              <line
                x1={margin.left}
                x2={margin.left + innerWidth}
                y1={yAt(population)}
                y2={yAt(population)}
                stroke="var(--chart-benchmark)"
                strokeWidth={1}
              />
              <text x={margin.left + 4} y={yAt(population) - 6} fontSize={11} fill="var(--foreground-muted)">
                Población: {formatCount(population)}
              </text>
            </g>
          )}

          {mode === 'cumulative' ? (
            <>
              <path d={completedArea} fill={COMPLETED} opacity={0.1} />
              <path
                d={startedLine}
                fill="none"
                stroke={STARTED}
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
                pathLength={1}
                className="lk-graf-trazo"
              />
              <path
                d={completedLine}
                fill="none"
                stroke={COMPLETED}
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
                pathLength={1}
                className="lk-graf-trazo"
              />
              <circle cx={xAt(days.length - 1)} cy={endCompleted} r={4.5} fill={COMPLETED} stroke="#fff" strokeWidth={2} />
              <circle cx={xAt(days.length - 1)} cy={yAt(last.cumulativeStarted)} r={4} fill={STARTED} stroke="#fff" strokeWidth={2} />
              <text x={xAt(days.length - 1) + 10} y={endCompleted + 4} fontSize={12} fontWeight={600} fill="var(--foreground)">
                {formatCount(last.cumulativeCompleted)} completas
              </text>
              <text x={xAt(days.length - 1) + 10} y={endStarted + 4} fontSize={12} fill="var(--foreground-muted)">
                {formatCount(last.cumulativeStarted)} iniciadas
              </text>
            </>
          ) : (
            days.map((day, index) => {
              const h = baseline - yAt(day.completed);
              return day.completed > 0 ? (
                <path
                  key={day.date}
                  className="lk-graf-columna"
                  style={stagger(index, 0.02)}
                  d={roundedTop(xAt(index) - columnWidth / 2, yAt(day.completed), columnWidth, h, Math.min(4, columnWidth / 2))}
                  fill={COMPLETED}
                />
              ) : null;
            })
          )}

          {hovered && hoverIndex !== null && (
            <g>
              <line
                x1={xAt(hoverIndex)}
                x2={xAt(hoverIndex)}
                y1={margin.top}
                y2={baseline}
                stroke="var(--chart-benchmark)"
                strokeOpacity={0.35}
              />
              {mode === 'cumulative' && (
                <>
                  <circle cx={xAt(hoverIndex)} cy={yAt(hovered.cumulativeStarted)} r={4} fill={STARTED} stroke="#fff" strokeWidth={2} />
                  <circle cx={xAt(hoverIndex)} cy={yAt(hovered.cumulativeCompleted)} r={4.5} fill={COMPLETED} stroke="#fff" strokeWidth={2} />
                </>
              )}
            </g>
          )}

          {/* La cruz encuentra el día: el lector apunta a una fecha, no a una línea de 2 px. */}
          <rect
            x={margin.left - step / 2}
            y={margin.top}
            width={innerWidth + step}
            height={innerHeight}
            fill="transparent"
            onPointerMove={handlePointer}
            onPointerLeave={() => setHoverIndex(null)}
          />
        </svg>
      )}

      {hovered && hoverIndex !== null && (
        <ChartTooltip x={xAt(hoverIndex)} y={margin.top} containerWidth={width}>
          <p className="mb-1 font-medium text-white">{formatDay(hovered.date, true)}</p>
          {mode === 'cumulative' ? (
            <>
              <TooltipRow color={COMPLETED} value={formatCount(hovered.cumulativeCompleted)} label="completas a la fecha" />
              <TooltipRow color={STARTED} value={formatCount(hovered.cumulativeStarted)} label="iniciadas a la fecha" />
              <p className="mt-1 text-slate-300">
                Ese día: +{hovered.completed} completas · +{hovered.started} abiertas
              </p>
            </>
          ) : (
            <>
              <TooltipRow color={COMPLETED} value={formatCount(hovered.completed)} label="completadas ese día" />
              <TooltipRow value={formatCount(hovered.started)} label="abiertas ese día" />
            </>
          )}
        </ChartTooltip>
      )}
    </div>
  );
}

/** Columna con el extremo de datos redondeado y la base recta, anclada a la línea base. */
export function roundedTop(x: number, y: number, w: number, h: number, r: number): string {
  if (h <= 0) return '';
  const radius = Math.min(r, h);
  return `M${x},${y + h} V${y + radius} Q${x},${y} ${x + radius},${y} H${x + w - radius} Q${x + w},${y} ${x + w},${y + radius} V${y + h} Z`;
}
