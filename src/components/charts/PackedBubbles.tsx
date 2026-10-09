'use client';

import { useId, useMemo, useState } from 'react';
import { ChartTooltip, TooltipRow, stagger, useMeasure } from './chart-utils';
import { packInto } from './pack';
import { EmptyState } from './InsufficientData';

export interface Bubble {
  key: string;
  label: string;
  value: number;
  /** El color de relleno. Una sola serie va en el tono 1; los estados, en su rampa. */
  color: string;
  /** Tinta del texto dentro de la burbuja, elegida por la luminancia del relleno. */
  ink?: string;
  /** Línea secundaria del tooltip: «3 de 12 personas», «Sin clasificar». */
  detail?: string;
  /** Burbujas sin valor que igual deben verse (un área sin respuestas): van como aro. */
  hollow?: boolean;
}

/**
 * Burbujas empaquetadas: cada idea, o cada área, es un círculo cuya ÁREA es proporcional
 * al valor.
 *
 * Es la forma que usa la línea gráfica de referencia para mirar respuestas en vivo, y
 * sirve justo para eso: con decenas de elementos de tamaño muy desigual, una barra por
 * elemento ocupa tres pantallas y las pequeñas se vuelven ilegibles, mientras que aquí la
 * masa de lo que más se repite salta a la vista y la cola larga se ve como cola larga.
 * No sirve para comparar dos valores parecidos —para eso está la vista de tabla al lado.
 *
 * El contador va en una ficha pegada al borde de la burbuja cuando el valor pasa de uno,
 * y el nombre solo dentro de las que lo pueden contener sin recortarlo.
 */
export function PackedBubbles({
  bubbles,
  height = 420,
  onSelect,
  selectedKey,
  ariaLabel,
  unit = { one: 'mención', other: 'menciones' },
  emptyMessage,
  focusLimit = 40,
}: {
  bubbles: Bubble[];
  height?: number;
  onSelect?: (bubble: Bubble) => void;
  selectedKey?: string | null;
  ariaLabel: string;
  unit?: { one: string; other: string };
  emptyMessage?: string;
  /**
   * Cuántas burbujas entran en el orden de tabulación. Con cientos de ideas, cientos de
   * paradas de teclado vuelven la página inusable; las demás se alcanzan desde la tabla.
   */
  focusLimit?: number;
}) {
  const { ref, width } = useMeasure<HTMLDivElement>();
  const [hover, setHover] = useState<{ key: string; x: number; y: number } | null>(null);
  const gradientId = useId().replace(/:/g, '');

  const packed = useMemo(
    () => packInto(bubbles, (bubble) => (bubble.hollow ? 0 : bubble.value), { width, height }),
    [bubbles, width, height],
  );

  const focusable = useMemo(
    () => new Set(packed.slice(0, focusLimit).map((entry) => entry.item.key)),
    [packed, focusLimit],
  );

  if (bubbles.length === 0) {
    return <EmptyState message={emptyMessage ?? 'Todavía no hay nada que mostrar.'} />;
  }

  const hovered = hover ? packed.find((entry) => entry.item.key === hover.key) : null;
  const colors = [...new Set(bubbles.map((bubble) => bubble.color))];

  return (
    <div
      ref={ref}
      className="relative w-full overflow-hidden rounded-2xl bg-surface-sunken ring-1 ring-border-subtle"
      style={{ height }}
    >
      {width > 0 && (
        <svg width={width} height={height} role="group" aria-label={ariaLabel} className="block">
          <defs>
            {/* Un brillo arriba a la izquierda, como en la referencia: la burbuja se lee como
                volumen y no como un disco plano. */}
            {colors.map((color, index) => (
              <radialGradient key={color} id={`${gradientId}-${index}`} cx="32%" cy="28%" r="80%">
                <stop offset="0%" style={{ stopColor: `color-mix(in srgb, ${color} 78%, white)` }} />
                <stop offset="100%" style={{ stopColor: color }} />
              </radialGradient>
            ))}
          </defs>

          {packed.map((entry, index) => {
            const { item, x, y, r } = entry;
            const selected = selectedKey === item.key;
            const isHover = hover?.key === item.key;
            const fill = item.hollow
              ? 'var(--surface)'
              : `url(#${gradientId}-${colors.indexOf(item.color)})`;
            const label = labelLines(item.label, r);
            const badge = item.value > 1 && r >= 7;
            const badgeR = Math.min(Math.max(r * 0.42, 8), 12);
            const canFocus = focusable.has(item.key) && Boolean(onSelect);

            return (
              <g
                key={item.key}
                className="lk-burbuja"
                style={stagger(index, 0.012, 0.7)}
                role={canFocus ? 'button' : undefined}
                tabIndex={canFocus ? 0 : undefined}
                aria-label={`${item.label}: ${item.value} ${item.value === 1 ? unit.one : unit.other}${item.detail ? `. ${item.detail}` : ''}`}
                aria-pressed={canFocus ? selected : undefined}
                onPointerEnter={() => setHover({ key: item.key, x, y: y - r })}
                onPointerLeave={() => setHover(null)}
                onFocus={() => setHover({ key: item.key, x, y: y - r })}
                onBlur={() => setHover(null)}
                onClick={() => onSelect?.(item)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onSelect?.(item);
                  }
                }}
                cursor={onSelect ? 'pointer' : undefined}
              >
                <g
                  style={{
                    transformBox: 'fill-box',
                    transformOrigin: 'center',
                    transform: isHover || selected ? 'scale(1.06)' : 'scale(1)',
                    transition: 'transform 250ms var(--lk-ease-salida)',
                    filter: 'drop-shadow(0 2px 4px rgb(15 23 42 / 0.12))',
                  }}
                >
                  {/* Área de toque mayor que la marca: las burbujas pequeñas no exigen puntería. */}
                  <circle cx={x} cy={y} r={Math.max(r, 12)} fill="transparent" />
                  <circle
                    cx={x}
                    cy={y}
                    r={r}
                    fill={fill}
                    stroke={item.hollow ? 'var(--border-strong)' : selected ? 'var(--lk-navy-900)' : '#fff'}
                    strokeWidth={selected ? 2.5 : item.hollow ? 1.5 : 2}
                  />
                  {label && (
                    <text
                      textAnchor="middle"
                      fontSize={label.size}
                      fontWeight={600}
                      fill={item.hollow ? 'var(--foreground-muted)' : (item.ink ?? '#fff')}
                      style={{ pointerEvents: 'none' }}
                    >
                      {label.lines.map((line, lineIndex) => (
                        <tspan
                          key={lineIndex}
                          x={x}
                          y={y + (lineIndex - (label.lines.length - 1) / 2) * label.size * 1.15 + label.size * 0.35}
                        >
                          {line}
                        </tspan>
                      ))}
                    </text>
                  )}
                  {badge && (
                    <g style={{ pointerEvents: 'none' }}>
                      <circle
                        cx={x + r * 0.72}
                        cy={y - r * 0.72}
                        r={badgeR}
                        fill="#fff"
                        stroke={item.color}
                        strokeWidth={1.5}
                      />
                      <text
                        x={x + r * 0.72}
                        y={y - r * 0.72 + badgeR * 0.36}
                        textAnchor="middle"
                        fontSize={Math.round(badgeR * 0.95)}
                        fontWeight={700}
                        fill="var(--foreground)"
                      >
                        {item.value}
                      </text>
                    </g>
                  )}
                </g>
              </g>
            );
          })}
        </svg>
      )}

      {hover && hovered && (
        <ChartTooltip x={hover.x} y={Math.max(hover.y - 8, 4)} containerWidth={width}>
          <TooltipRow
            color={hovered.item.hollow ? 'var(--border-strong)' : hovered.item.color}
            value={hovered.item.value}
            label={hovered.item.value === 1 ? unit.one : unit.other}
          />
          <p className="mt-1 max-w-56 text-[13px] font-medium whitespace-normal text-white">
            {hovered.item.label}
          </p>
          {hovered.item.detail && <p className="mt-0.5 text-slate-300">{hovered.item.detail}</p>}
          {onSelect && <p className="mt-1 text-slate-400">Clic para ver el detalle</p>}
        </ChartTooltip>
      )}
    </div>
  );
}

/**
 * Parte el nombre en líneas que quepan en el diámetro: dos en las burbujas medianas, tres
 * en las grandes. Si aun así no cabe, la última línea termina en «…» en un corte de
 * palabra —nunca a mitad de una— y el texto completo queda en el tooltip, en el panel y en
 * la tabla. Por debajo de cierto radio no se escribe nada: un nombre ilegible es ruido.
 */
function labelLines(text: string, r: number): { lines: string[]; size: number } | null {
  if (r < 22) return null;
  const size = r >= 48 ? 12 : r >= 32 ? 11 : 10;
  const maxLines = r >= 44 ? 3 : 2;
  const maxChars = Math.floor((r * 1.55) / (size * 0.58));
  const words = text.split(/\s+/).filter(Boolean);
  if (words.some((word) => word.length > maxChars)) return null;

  const lines: string[] = [];
  let current = '';
  let index = 0;
  for (; index < words.length; index += 1) {
    const candidate = current ? `${current} ${words[index]}` : words[index];
    if (candidate.length <= maxChars) {
      current = candidate;
      continue;
    }
    lines.push(current);
    current = words[index];
    if (lines.length === maxLines) break;
  }

  if (lines.length < maxLines && current) {
    lines.push(current);
    index = words.length;
  }
  if (index < words.length) {
    // Sobra texto: la última línea se recorta por palabras hasta que quepa la elipsis.
    let last = lines[lines.length - 1];
    while (last.length + 1 > maxChars && last.includes(' ')) last = last.slice(0, last.lastIndexOf(' '));
    lines[lines.length - 1] = `${last}…`;
  }
  return { lines, size };
}
