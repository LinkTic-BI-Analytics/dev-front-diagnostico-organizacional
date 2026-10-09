'use client';

import { useState } from 'react';
import type { ThresholdBand } from '@/lib/admin.types';
import { formatNumber } from '@/lib/score-scale';
import { ChartTooltip, TooltipRow, niceTicks, stagger, useMeasure } from './chart-utils';
import { bandShares } from './LikertBars';
import { roundedTop } from './TimelineChart';

/**
 * Cuántas personas dieron cada nota del 0 al 10 a una afirmación, con la columna pintada
 * del color de su banda y el promedio marcado. Es la vista que deja ver si un promedio
 * mediocre es acuerdo («todos dan 6») o división («unos 2, otros 10»).
 */
export function ItemHistogram({
  distribution,
  mean,
  bands,
  height = 236,
}: {
  distribution: number[];
  mean: number | null;
  bands: ThresholdBand[];
  height?: number;
}) {
  const { ref, width } = useMeasure<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const total = distribution.reduce((sum, count) => sum + count, 0);

  // Margen superior holgado: el rótulo del promedio va por encima de la cifra de la columna
  // más alta, no sobre ella.
  const margin = { top: 38, right: 8, bottom: 26, left: 28 };
  const innerWidth = Math.max(width - margin.left - margin.right, 10);
  const innerHeight = height - margin.top - margin.bottom;
  const ticks = niceTicks(Math.max(...distribution, 1), 3);
  const top = ticks[ticks.length - 1];
  const band = innerWidth / 11;
  const columnWidth = Math.min(22, band * 0.66);
  const yAt = (value: number) => margin.top + innerHeight - (value / top) * innerHeight;

  // El color de cada nota es el de la banda en que cae (nota × 10).
  const colorOf = (score: number) => {
    const shares = bandShares(distribution.map((_, index) => (index === score ? 1 : 0)), bands);
    return shares.find((entry) => entry.share > 0)?.color ?? 'var(--series-1)';
  };

  return (
    <div ref={ref} className="relative w-full" style={{ height }}>
      {width > 0 && (
        <svg width={width} height={height} className="block overflow-visible" aria-hidden="true">
          {ticks.map((tick) => (
            <line
              key={tick}
              x1={margin.left}
              x2={margin.left + innerWidth}
              y1={yAt(tick)}
              y2={yAt(tick)}
              stroke={tick === 0 ? 'var(--chart-axis)' : 'var(--chart-grid)'}
            />
          ))}
          {ticks.map((tick) => (
            <text key={`t-${tick}`} x={margin.left - 6} y={yAt(tick) + 4} textAnchor="end" fontSize={10.5} fill="var(--chart-ink)">
              {tick}
            </text>
          ))}
          {distribution.map((count, score) => {
            const x = margin.left + score * band + (band - columnWidth) / 2;
            const y = yAt(count);
            return (
              <g key={score} onPointerEnter={() => setHover(score)} onPointerLeave={() => setHover(null)}>
                <rect x={margin.left + score * band} y={margin.top} width={band} height={innerHeight} fill="transparent" />
                {count > 0 && (
                  <path
                    className="lk-graf-columna"
                    style={stagger(score, 0.03)}
                    d={roundedTop(x, y, columnWidth, yAt(0) - y, 4)}
                    fill={colorOf(score)}
                  />
                )}
                {count > 0 && (
                  <text x={x + columnWidth / 2} y={y - 5} textAnchor="middle" fontSize={11} fontWeight={600} fill="var(--foreground)">
                    {count}
                  </text>
                )}
                <text x={margin.left + score * band + band / 2} y={height - 8} textAnchor="middle" fontSize={11} fill="var(--chart-ink)">
                  {score}
                </text>
              </g>
            );
          })}
          {mean !== null && (
            <g>
              <line
                x1={margin.left + (mean + 0.5) * band}
                x2={margin.left + (mean + 0.5) * band}
                y1={margin.top - 22}
                y2={yAt(0)}
                stroke="var(--chart-benchmark)"
                strokeWidth={1.5}
              />
              <text
                x={margin.left + (mean + 0.5) * band + (mean > 7 ? -6 : 6)}
                y={margin.top - 26}
                textAnchor={mean > 7 ? 'end' : 'start'}
                fontSize={11}
                fill="var(--foreground-muted)"
              >
                Promedio {formatNumber(mean, 1)}
              </text>
            </g>
          )}
        </svg>
      )}
      {hover !== null && (
        <ChartTooltip x={margin.left + hover * band + band / 2} y={yAt(distribution[hover]) - 10} containerWidth={width}>
          <TooltipRow color={colorOf(hover)} value={distribution[hover]} label={distribution[hover] === 1 ? 'persona' : 'personas'} />
          <p className="mt-0.5 text-slate-300">
            Nota {hover} · {total ? formatNumber((distribution[hover] / total) * 100, 0) : 0}&#8239;% de las respuestas
          </p>
        </ChartTooltip>
      )}
    </div>
  );
}
