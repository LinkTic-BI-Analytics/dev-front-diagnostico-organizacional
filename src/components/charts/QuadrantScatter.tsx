'use client';

import { useMemo, useState } from 'react';
import { formatNumber } from '@/lib/score-scale';
import { ChartTooltip, TooltipRow, stagger, useMeasure } from './chart-utils';
import { EmptyState } from './InsufficientData';

export interface ScatterPoint {
  key: string;
  label: string;
  x: number;
  y: number;
  /** Para destacar con rótulo las más extremas; el orden lo decide quien llama. */
  emphasis?: number;
  href?: string;
  /** Color del punto; sin él, el tono 1. Lo usa quien codifica una banda en el punto. */
  color?: string;
  /** Punto hueco: el dato existe pero está incompleto (la vista explica por qué). */
  hollow?: boolean;
  /** Filas extra del tooltip, después de las dos medidas. */
  detail?: { value: string; label: string }[];
}

interface Quadrant {
  /** Arriba a la izquierda, arriba a la derecha, abajo a la izquierda, abajo a la derecha. */
  topLeft: string;
  topRight: string;
  bottomLeft: string;
  bottomRight: string;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

/**
 * El plano: dos medidas de cada área, una por eje, cortado por sus medianas.
 *
 * Es la forma que la línea gráfica de referencia usa para ordenar factores por alcance e
 * intensidad, y aquí ordena áreas por lo que dan y lo que reciben. Las medianas no son
 * metas: parten el grupo en mitades, así que cada cuadrante dice «por encima o por debajo
 * de lo típico en LinkTIC» en las dos medidas a la vez. La diagonal añade la lectura de la
 * brecha: sobre ella, el área recibe lo mismo que da.
 *
 * Una sola serie y en el tono 1: los cuadrantes se distinguen por posición y por rótulo,
 * no por color, así que no hace falta gastar el canal del color en ellos.
 */
export function QuadrantScatter({
  points,
  xLabel,
  yLabel,
  quadrants,
  diagonalLabel,
  height = 440,
  labelCount = 6,
  onSelect,
  scales,
  formatX = (value: number) => formatNumber(value, 1),
  formatY = (value: number) => formatNumber(value, 1),
  emptyMessage = 'Hacen falta al menos dos áreas con los dos lados medidos para dibujar el plano.',
  selectHint = 'Clic para abrir la ficha',
  cut,
  neutralVeils = false,
}: {
  points: ScatterPoint[];
  xLabel: string;
  yLabel: string;
  quadrants: Quadrant;
  diagonalLabel?: string;
  height?: number;
  labelCount?: number;
  onSelect?: (point: ScatterPoint) => void;
  /**
   * Qué mide cada eje. Sin esto los dos comparten la misma escala 0-100 (lo que da y lo que
   * recibe un área), que es lo que hace legible la diagonal. Con medidas distintas
   * —menciones contra un índice— cada eje se ajusta a lo suyo: un índice se recorta a su
   * tramo útil de diez en diez; un conteo arranca en cero.
   */
  scales?: { x: 'index' | 'count'; y: 'index' | 'count' };
  formatX?: (value: number) => string;
  formatY?: (value: number) => string;
  emptyMessage?: string;
  selectHint?: string;
  /**
   * Dónde se corta el plano. Sin esto, en las medianas. El análisis estructural corta en
   * las medias, y las nombra así.
   */
  cut?: { x: number; y: number; label: string };
  /**
   * Velos de cuadrante todos neutros. Por defecto el de arriba a la derecha se tiñe de
   * azul (bueno en las dos medidas) y el de abajo a la izquierda de rojo; en un plano sin
   * cuadrante «bueno», como motricidad contra dependencia, ese tinte diría algo falso.
   */
  neutralVeils?: boolean;
}) {
  const { ref, width } = useMeasure<HTMLDivElement>();
  const [hover, setHover] = useState<string | null>(null);

  const domains = useMemo(() => {
    const indexDomain = (values: number[]) => {
      if (values.length === 0) return { min: 0, max: 100, step: 10 };
      const lo = Math.max(0, Math.floor((Math.min(...values) - 5) / 10) * 10);
      const hi = Math.min(100, Math.ceil((Math.max(...values) + 5) / 10) * 10);
      return { min: lo, max: Math.max(hi, lo + 20), step: 10 };
    };
    /**
     * Un conteo arranca en cero y termina en un número redondo, con pasos enteros: un eje de
     * conteos en 2,5 en 2,5 escribiría «3» donde dice 2,5.
     */
    const countDomain = (values: number[]) => {
      const max = Math.max(...values, 1);
      const rough = max / 5;
      const magnitude = 10 ** Math.floor(Math.log10(rough));
      const step = Math.max(1, [1, 2, 5, 10].map((m) => m * magnitude).find((candidate) => candidate >= rough) ?? magnitude * 10);
      return { min: 0, max: Math.ceil(max / step) * step, step };
    };
    const xs = points.map((point) => point.x);
    const ys = points.map((point) => point.y);
    if (!scales) {
      const shared = indexDomain([...xs, ...ys]);
      return { x: shared, y: shared };
    }
    return {
      x: scales.x === 'index' ? indexDomain(xs) : countDomain(xs),
      y: scales.y === 'index' ? indexDomain(ys) : countDomain(ys),
    };
  }, [points, scales]);

  if (points.length < 2) {
    return <EmptyState message={emptyMessage} />;
  }

  const margin = { top: 28, right: 20, bottom: 44, left: 48 };
  const innerWidth = Math.max(width - margin.left - margin.right, 10);
  const innerHeight = height - margin.top - margin.bottom;
  const { x: dx, y: dy } = domains;
  const xAt = (value: number) => margin.left + ((value - dx.min) / (dx.max - dx.min)) * innerWidth;
  const yAt = (value: number) =>
    margin.top + innerHeight - ((value - dy.min) / (dy.max - dy.min)) * innerHeight;

  const medianX = cut?.x ?? median(points.map((point) => point.x));
  const medianY = cut?.y ?? median(points.map((point) => point.y));
  const cutLabel = cut?.label ?? 'Mediana';
  const ticksOf = (domain: { min: number; max: number; step: number }) =>
    Array.from({ length: Math.round((domain.max - domain.min) / domain.step) + 1 }, (_, i) => domain.min + i * domain.step);
  const xTicks = ticksOf(dx);
  const yTicks = ticksOf(dy);

  const hovered = points.find((point) => point.key === hover) ?? null;

  /** El punto más cercano al cursor, si está a menos de 28 px: no hace falta atinarle. */
  function nearest(event: React.PointerEvent<SVGRectElement>) {
    const box = event.currentTarget.getBoundingClientRect();
    const px = event.clientX - box.left + margin.left;
    const py = event.clientY - box.top + margin.top;
    let best: { key: string; distance: number } | null = null;
    for (const point of points) {
      const distance = Math.hypot(xAt(point.x) - px, yAt(point.y) - py);
      if (distance < 28 && (!best || distance < best.distance)) best = { key: point.key, distance };
    }
    setHover(best?.key ?? null);
  }

  const x0 = xAt(dx.min);
  const x1 = xAt(dx.max);
  const y0 = yAt(dy.min);
  const y1 = yAt(dy.max);
  const mx = xAt(medianX);
  const my = yAt(medianY);

  /*
   * Rótulos sin choques: se recorren los puntos de más a menos destacados y cada rótulo
   * prueba a la derecha y a la izquierda de su punto; si en los dos lados pisa otro rótulo,
   * otro punto o el borde, no se escribe. El nombre de ese punto sigue en el tooltip y en
   * la tabla: un rótulo encimado no informa, tapa.
   */
  const placements = new Map<string, { x: number; anchor: 'start' | 'end'; text: string }>();
  {
    const boxes: { left: number; right: number; top: number; bottom: number }[] = [];
    const overlaps = (a: (typeof boxes)[number], b: (typeof boxes)[number]) =>
      a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
    const ordered = [...points].sort((a, b) => (b.emphasis ?? 0) - (a.emphasis ?? 0));
    for (const point of ordered) {
      if (placements.size >= labelCount) break;
      const cx = xAt(point.x);
      const cy = yAt(point.y);
      const text = point.label.length > 26 ? `${point.label.slice(0, 25)}…` : point.label;
      const textWidth = text.length * 6.4;
      for (const side of ['right', 'left'] as const) {
        const left = side === 'right' ? cx + 11 : cx - 11 - textWidth;
        const box = { left, right: left + textWidth, top: cy - 9, bottom: cy + 6 };
        if (box.left < x0 + 2 || box.right > x1 - 2) continue;
        if (boxes.some((other) => overlaps(box, other))) continue;
        const coversDot = points.some(
          (other) =>
            other.key !== point.key &&
            overlaps(box, { left: xAt(other.x) - 7, right: xAt(other.x) + 7, top: yAt(other.y) - 7, bottom: yAt(other.y) + 7 }),
        );
        if (coversDot) continue;
        boxes.push(box);
        placements.set(point.key, { x: side === 'right' ? cx + 11 : cx - 11, anchor: side === 'right' ? 'start' : 'end', text });
        break;
      }
    }
  }

  return (
    <div ref={ref} className="relative w-full" style={{ height }}>
      {width > 0 && (
        <svg width={width} height={height} className="block overflow-visible" aria-hidden="true">
          {/* Velos de cuadrante: el de arriba a la derecha es el bueno en las dos medidas. */}
          <rect x={mx} y={y1} width={x1 - mx} height={my - y1} fill={neutralVeils ? '#94a3b8' : '#2a78d6'} opacity={0.06} />
          <rect x={x0} y={my} width={mx - x0} height={y0 - my} fill={neutralVeils ? '#94a3b8' : '#e34948'} opacity={neutralVeils ? 0.06 : 0.05} />
          <rect x={x0} y={y1} width={mx - x0} height={my - y1} fill="#94a3b8" opacity={0.06} />
          <rect x={mx} y={my} width={x1 - mx} height={y0 - my} fill="#94a3b8" opacity={0.06} />

          {xTicks.map((tick) => (
            <g key={`x-${tick}`}>
              <line x1={xAt(tick)} x2={xAt(tick)} y1={y1} y2={y0} stroke="var(--chart-grid)" />
              <text x={xAt(tick)} y={y0 + 16} textAnchor="middle" fontSize={11} fill="var(--chart-ink)">
                {formatNumber(tick, 0)}
              </text>
            </g>
          ))}
          {yTicks.map((tick) => (
            <g key={`y-${tick}`}>
              <line x1={x0} x2={x1} y1={yAt(tick)} y2={yAt(tick)} stroke="var(--chart-grid)" />
              <text x={x0 - 8} y={yAt(tick) + 4} textAnchor="end" fontSize={11} fill="var(--chart-ink)">
                {formatNumber(tick, 0)}
              </text>
            </g>
          ))}

          {diagonalLabel && (
            <g>
              <line x1={x0} y1={y0} x2={x1} y2={y1} stroke="var(--chart-axis)" strokeWidth={1} />
              {/* El rótulo va a tres cuartos de la diagonal y por encima de ella: en la
                  esquina chocaría con el nombre del cuadrante. */}
              <text
                x={x0 + (x1 - x0) * 0.74}
                y={y0 - (y0 - y1) * 0.74 - 6}
                textAnchor="end"
                fontSize={10.5}
                fill="var(--chart-ink)"
                transform={`rotate(${(-Math.atan2(y0 - y1, x1 - x0) * 180) / Math.PI} ${x0 + (x1 - x0) * 0.74} ${y0 - (y0 - y1) * 0.74 - 6})`}
              >
                {diagonalLabel}
              </text>
            </g>
          )}

          <line x1={mx} x2={mx} y1={y1} y2={y0} stroke="var(--chart-benchmark)" strokeOpacity={0.55} />
          <line x1={x0} x2={x1} y1={my} y2={my} stroke="var(--chart-benchmark)" strokeOpacity={0.55} />
          <text x={mx} y={y1 - 8} textAnchor="middle" fontSize={11} fill="var(--foreground-muted)">
            {cutLabel} {formatX(medianX)}
          </text>
          <text x={x1} y={my - 6} textAnchor="end" fontSize={11} fill="var(--foreground-muted)">
            {cutLabel} {formatY(medianY)}
          </text>

          <QuadrantLabel x={x0 + 8} y={y1 + 16} text={quadrants.topLeft} />
          <QuadrantLabel x={x1 - 8} y={y1 + 16} text={quadrants.topRight} anchor="end" />
          <QuadrantLabel x={x0 + 8} y={y0 - 10} text={quadrants.bottomLeft} />
          <QuadrantLabel x={x1 - 8} y={y0 - 10} text={quadrants.bottomRight} anchor="end" />

          {points.map((point, index) => {
            const cx = xAt(point.x);
            const cy = yAt(point.y);
            const active = hover === point.key;
            const placement = placements.get(point.key);
            return (
              <g key={point.key}>
                <circle
                  className="lk-graf-punto"
                  style={stagger(index, 0.03)}
                  cx={cx}
                  cy={cy}
                  r={active ? 7.5 : 6}
                  fill={point.hollow ? '#fff' : (point.color ?? 'var(--series-1)')}
                  stroke={point.hollow ? (point.color ?? 'var(--chart-ink)') : '#fff'}
                  strokeWidth={2}
                />
                {placement && (
                  <text
                    x={placement.x}
                    y={cy + 4}
                    textAnchor={placement.anchor}
                    fontSize={11.5}
                    fontWeight={600}
                    fill="var(--foreground)"
                    paintOrder="stroke"
                    stroke="#fff"
                    strokeWidth={3}
                    strokeLinejoin="round"
                  >
                    {placement.text}
                  </text>
                )}
              </g>
            );
          })}

          <text x={x1} y={height - 6} textAnchor="end" fontSize={11} fill="var(--chart-ink)">
            {xLabel} →
          </text>
          <text x={x0 - 40} y={y1 - 12} fontSize={11} fill="var(--chart-ink)">
            ↑ {yLabel}
          </text>

          <rect
            x={x0}
            y={y1}
            width={x1 - x0}
            height={y0 - y1}
            fill="transparent"
            onPointerMove={nearest}
            onPointerLeave={() => setHover(null)}
            onClick={() => {
              if (hovered && onSelect) onSelect(hovered);
            }}
            style={{ cursor: hovered && onSelect ? 'pointer' : undefined }}
          />
        </svg>
      )}

      {hovered && (
        <ChartTooltip x={xAt(hovered.x)} y={yAt(hovered.y) - 10} containerWidth={width}>
          <p className="mb-1 max-w-56 font-medium whitespace-normal text-white">{hovered.label}</p>
          <TooltipRow value={formatY(hovered.y)} label={yLabel.toLowerCase()} />
          <TooltipRow value={formatX(hovered.x)} label={xLabel.toLowerCase()} />
          {hovered.detail?.map((row) => (
            <TooltipRow key={row.label} value={row.value} label={row.label} />
          ))}
          {onSelect && <p className="mt-1 text-slate-400">{selectHint}</p>}
        </ChartTooltip>
      )}
    </div>
  );
}

function QuadrantLabel({
  x,
  y,
  text,
  anchor = 'start',
}: {
  x: number;
  y: number;
  text: string;
  anchor?: 'start' | 'end';
}) {
  return (
    <text x={x} y={y} textAnchor={anchor} fontSize={11} fontWeight={600} fill="var(--foreground-muted)">
      {text}
    </text>
  );
}
