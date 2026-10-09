'use client';

import { useId, useMemo, useState } from 'react';
import Link from 'next/link';
import clsx from 'clsx';
import type { InfluenceEdge, InfluenceLevel, InfluenceNode, ThresholdBand } from '@/lib/admin.types';
import { ZONE_LABELS, isLowScore, type InfluenceUnit } from '@/lib/insights';
import { classify, formatIndex } from '@/lib/score-scale';
import { useMeasure } from './chart-utils';
import { EmptyState } from './InsufficientData';

/** Por debajo de este ancho las curvas se enredan: el lienzo se desplaza dentro de la tarjeta. */
const MIN_WIDTH = 760;
const NODE_H = 44;
const NODE_GAP = 10;
const HEADER_H = 34;
const SUBHEAD_H = 30;
/** Aire a la derecha para las relaciones entre nodos de la última columna. */
const RIGHT_MARGIN = 44;

/** Gris de más claro a más oscuro con la fuerza: la intensidad se lee sin leyenda de color. */
const STROKES: Record<1 | 2 | 3, { color: string; width: number }> = {
  1: { color: '#cbd5e1', width: 1.25 },
  2: { color: '#94a3b8', width: 1.75 },
  3: { color: '#475569', width: 2.5 },
};
const HIGHLIGHT = '#2a78d6';

type Column = 0 | 1 | 2;

/**
 * Tres capas, como en la línea gráfica de referencia: qué mueve, qué transmite y qué
 * resulta. Las autónomas van con las de abajo del plano —mueven poco—, en su propio bloque.
 */
const COLUMN_OF: Record<InfluenceNode['zone'], Column> = {
  MOTRIZ: 0,
  ENLACE: 1,
  DEPENDIENTE: 2,
  AUTONOMA: 2,
};
const COLUMNS = [
  { title: 'Motrices', hint: 'mueven' },
  { title: 'De enlace', hint: 'transmiten' },
  { title: 'Dependientes', hint: 'resienten' },
];

interface Box {
  node: InfluenceNode;
  column: Column;
  x: number;
  y: number;
  w: number;
  h: number;
}

function layout(nodes: InfluenceNode[], width: number) {
  const gap = Math.min(Math.max(width * 0.11, 72), 150);
  const columnWidth = (width - 2 * gap - RIGHT_MARGIN) / 3;
  const columns: InfluenceNode[][] = [[], [], []];
  // Los nodos llegan ordenados por zona y, dentro de cada una, de más a menos motriz.
  for (const node of nodes) columns[COLUMN_OF[node.zone]].push(node);

  const hasAutonomous = columns[2].some((node) => node.zone === 'AUTONOMA');
  const heights = columns.map(
    (column, index) =>
      Math.max(column.length * (NODE_H + NODE_GAP) - NODE_GAP, 0) +
      (index === 2 && hasAutonomous ? SUBHEAD_H : 0),
  );
  const inner = Math.max(...heights, NODE_H);

  const boxes = new Map<string, Box>();
  let subhead: { x: number; y: number } | null = null;
  columns.forEach((column, index) => {
    const x = index * (columnWidth + gap);
    let y = HEADER_H + (inner - heights[index]) / 2;
    for (const node of column) {
      if (node.zone === 'AUTONOMA' && !subhead) {
        subhead = { x, y };
        y += SUBHEAD_H;
      }
      boxes.set(node.code, { node, column: index as Column, x, y, w: columnWidth, h: NODE_H });
      y += NODE_H + NODE_GAP;
    }
  });

  return { boxes, subhead: subhead as { x: number; y: number } | null, columnWidth, gap, height: HEADER_H + inner + 12 };
}

/**
 * La curva de una relación. Hacia adelante (de una capa a la siguiente) sale por la derecha
 * y entra por la izquierda; dentro de la misma capa hace un arco por la derecha; de vuelta
 * (de una capa posterior a una anterior) sale por la izquierda y entra por la derecha, y se
 * dibuja punteada para que no se lea como una más del flujo.
 */
function edgePath(a: Box, b: Box): string {
  const ay = a.y + a.h / 2;
  const by = b.y + b.h / 2;
  if (a.column < b.column) {
    const x1 = a.x + a.w;
    const x2 = b.x - 2;
    const dx = (x2 - x1) * 0.5;
    return `M${x1},${ay} C${x1 + dx},${ay} ${x2 - dx},${by} ${x2},${by}`;
  }
  if (a.column === b.column) {
    const x = a.x + a.w;
    const bulge = 22 + Math.min(Math.abs(by - ay) * 0.22, 70);
    return `M${x},${ay} C${x + bulge},${ay} ${x + bulge},${by} ${x + 2},${by}`;
  }
  const x1 = a.x;
  const x2 = b.x + b.w + 2;
  const dx = (x1 - x2) * 0.5;
  return `M${x1},${ay} C${x1 - dx},${ay} ${x2 + dx},${by} ${x2},${by}`;
}

/**
 * La red de influencias: quién mueve a quién.
 *
 * Cada flecha va de la que entrega a la que depende: si la gente de PMO evalúa a Tecnología,
 * es porque trabaja con ella y le pesa lo que Tecnología le entrega. El grosor y el tono dicen
 * la fuerza (tercios del peso: personas por frecuencia); el punto de cada nodo, el
 * relacionamiento que recibe, con los colores del semáforo.
 *
 * Pasar el cursor —o el foco del teclado— por un nodo enciende sus relaciones y apaga el
 * resto; un clic lo deja fijo. La vista de tabla es el gemelo accesible.
 */
export function InfluenceNetwork({
  level,
  bands,
  numbers,
  unit,
  hrefOf,
}: {
  level: InfluenceLevel;
  bands: ThresholdBand[];
  /** El número de cada nodo (#1, #2…), el mismo en la red, la matriz y el plano. */
  numbers: Map<string, number>;
  unit: InfluenceUnit;
  /** A dónde lleva el nodo fijado, si tiene ficha. */
  hrefOf?: (code: string) => string | undefined;
}) {
  const { ref, width: measured } = useMeasure<HTMLDivElement>();
  const width = Math.max(measured, MIN_WIDTH);
  const [hover, setHover] = useState<string | null>(null);
  const [pinned, setPinned] = useState<string | null>(null);
  const [onlyStrong, setOnlyStrong] = useState(false);
  const [critical, setCritical] = useState(false);
  const markerBase = `lk-flecha-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;

  const geometry = useMemo(() => layout(level.nodes, width), [level.nodes, width]);

  if (level.nodes.length === 0) {
    return <EmptyState message={`Todavía no hay relaciones entre ${unit.many} para dibujar la red.`} />;
  }

  const { boxes, subhead, height, columnWidth, gap } = geometry;
  const focus = hover ?? pinned;
  const edges = level.edges.filter(
    (edge) => (!onlyStrong || edge.strength === 3) && boxes.has(edge.from) && boxes.has(edge.to),
  );
  const neighbors = focus
    ? new Set(edges.filter((edge) => edge.from === focus || edge.to === focus).flatMap((edge) => [edge.from, edge.to]))
    : null;
  const hasBackward = edges.some((edge) => boxes.get(edge.from)!.column > boxes.get(edge.to)!.column);
  const hasUnmeasured = level.nodes.some((node) => node.grantedBy === 0);

  const lowBands = bands.filter((band) => isLowScore((band.minValue + band.maxValue) / 2, bands));
  // En un teléfono las curvas no caben: la red se lee como lista, capa por capa.
  const compact = measured > 0 && measured < 640;

  /** Color, grosor, opacidad y punta de flecha de cada relación según el estado de la vista. */
  function styleOf(edge: InfluenceEdge) {
    const base = STROKES[edge.strength];
    const touches = focus !== null && (edge.from === focus || edge.to === focus);
    if (focus !== null) {
      return touches
        ? { color: HIGHLIGHT, width: base.width + 0.5, opacity: 1, marker: 'hi', front: true }
        : { color: base.color, width: base.width, opacity: 0.08, marker: `s${edge.strength}`, front: false };
    }
    if (critical) {
      const band = isLowScore(edge.irel, bands) ? classify(edge.irel, bands) : null;
      return band
        ? { color: band.color, width: Math.max(base.width, 2), opacity: 1, marker: `b${bands.indexOf(band)}`, front: true }
        : { color: base.color, width: base.width, opacity: 0.25, marker: `s${edge.strength}`, front: false };
    }
    return { color: base.color, width: base.width, opacity: 1, marker: `s${edge.strength}`, front: edge.strength === 3 };
  }

  const drawn = edges
    .map((edge) => ({ edge, style: styleOf(edge) }))
    .sort((a, b) => Number(a.style.front) - Number(b.style.front) || a.edge.strength - b.edge.strength);

  const markers: { id: string; color: string }[] = [
    { id: 's1', color: STROKES[1].color },
    { id: 's2', color: STROKES[2].color },
    { id: 's3', color: STROKES[3].color },
    { id: 'hi', color: HIGHLIGHT },
    ...bands.map((band, index) => ({ id: `b${index}`, color: band.color })),
  ];

  const focusBox = focus ? boxes.get(focus) ?? null : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        {level.edges.length > 0 && (
          <div className="lk-no-imprimir flex flex-wrap gap-2">
            <Toggle pressed={onlyStrong} onChange={setOnlyStrong}>
              Solo relaciones fuertes
            </Toggle>
            <Toggle pressed={critical} onChange={setCritical}>
              Resaltar las que están bajo lo aceptable
            </Toggle>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[12.5px] text-foreground-muted">
          <span className={clsx('flex items-center gap-3', compact && 'hidden')}>
            {([3, 2, 1] as const).map((strength) => (
              <span key={strength} className="flex items-center gap-1.5">
                <span
                  aria-hidden
                  className="inline-block w-4 rounded-full"
                  style={{ height: STROKES[strength].width, backgroundColor: STROKES[strength].color }}
                />
                {strength === 3 ? 'Fuerte' : strength === 2 ? 'Media' : 'Débil'}
              </span>
            ))}
            {hasBackward && (
              <span className="flex items-center gap-1.5">
                <svg aria-hidden width="16" height="4">
                  <line x1="0" y1="2" x2="16" y2="2" stroke={STROKES[2].color} strokeWidth="1.75" strokeDasharray="4 3" />
                </svg>
                De vuelta
              </span>
            )}
          </span>
          <span className="flex flex-wrap items-center gap-3">
            <span className="text-foreground-subtle">Punto: relacionamiento recibido</span>
            {bands.map((band) => (
              <span key={band.label} className="flex items-center gap-1.5">
                <span aria-hidden className="size-2.5 rounded-full" style={{ backgroundColor: band.color }} />
                {band.label}
              </span>
            ))}
            <span className="flex items-center gap-1.5">
              <span aria-hidden className="size-2.5 rounded-full shadow-[inset_0_0_0_1.5px_var(--chart-ink)]" />
              Sin dato publicable
            </span>
          </span>
          {hasUnmeasured && (
            <span className="flex items-center gap-1.5">
              <span aria-hidden className="h-3 w-5 rounded-[4px] border border-dashed border-foreground-subtle" />
              Nadie de ella respondió: dependencia sin medir
            </span>
          )}
        </div>
      </div>

      <div ref={ref} className="relative -mx-1 overflow-x-auto px-1 pb-1">
        {compact && (
          <CompactNetwork
            nodes={level.nodes}
            edges={edges}
            numbers={numbers}
            bands={bands}
            critical={critical}
            hrefOf={hrefOf}
          />
        )}
        {measured > 0 && !compact && (
          <div
            className="relative"
            style={{ width, height }}
            onKeyDown={(event) => {
              if (event.key === 'Escape') setPinned(null);
            }}
          >
            {COLUMNS.map((column, index) => (
              <p
                key={column.title}
                className="absolute top-0 text-[11px] font-semibold tracking-[0.12em] text-foreground-subtle uppercase"
                style={{ left: index * (columnWidth + gap), width: columnWidth }}
              >
                {column.title}
                <span className="ml-1.5 font-normal tracking-normal normal-case">· {column.hint}</span>
              </p>
            ))}
            {subhead && (
              <p
                className="absolute text-[11px] font-semibold tracking-[0.12em] text-foreground-subtle uppercase"
                style={{ left: subhead.x, top: subhead.y + 6 }}
              >
                Autónomas
                <span className="ml-1.5 font-normal tracking-normal normal-case">· mueven y dependen poco</span>
              </p>
            )}

            <svg width={width} height={height} className="absolute inset-0 overflow-visible" aria-hidden="true">
              <defs>
                {markers.map((marker) => (
                  <marker
                    key={marker.id}
                    id={`${markerBase}-${marker.id}`}
                    viewBox="0 0 10 10"
                    refX="9"
                    refY="5"
                    markerWidth="7"
                    markerHeight="7"
                    markerUnits="userSpaceOnUse"
                    orient="auto"
                  >
                    <path d="M0,0.5 L10,5 L0,9.5 z" fill={marker.color} />
                  </marker>
                ))}
              </defs>
              {drawn.map(({ edge, style }) => {
                const a = boxes.get(edge.from)!;
                const b = boxes.get(edge.to)!;
                return (
                  <path
                    key={`${edge.from}-${edge.to}`}
                    d={edgePath(a, b)}
                    fill="none"
                    stroke={style.color}
                    strokeWidth={style.width}
                    strokeLinecap="round"
                    strokeDasharray={a.column > b.column ? '5 4' : undefined}
                    opacity={style.opacity}
                    markerEnd={`url(#${markerBase}-${style.marker})`}
                    className="lk-graf-celda transition-opacity duration-200"
                  />
                );
              })}
            </svg>

            {[...boxes.values()].map(({ node, x, y, w, h }) => {
              const band = classify(node.irelReceived, bands);
              const dimmed = neighbors !== null && !neighbors.has(node.code) && node.code !== focus;
              const active = node.code === focus;
              return (
                <button
                  key={node.code}
                  type="button"
                  onMouseEnter={() => setHover(node.code)}
                  onMouseLeave={() => setHover(null)}
                  onFocus={() => setHover(node.code)}
                  onBlur={() => setHover(null)}
                  onClick={() => setPinned((current) => (current === node.code ? null : node.code))}
                  aria-pressed={pinned === node.code}
                  aria-label={`#${numbers.get(node.code)} ${node.name}: ${ZONE_LABELS[node.zone].toLowerCase()}, mueve a ${node.clients}, depende de ${node.providers}${node.irelReceived !== null ? `, relacionamiento recibido ${formatIndex(node.irelReceived, 1)}` : ''}`}
                  className={clsx(
                    'absolute flex items-center gap-2 rounded-xl border bg-white px-3 text-left shadow-[0_1px_2px_#0f172a14] transition-[opacity,border-color,box-shadow] duration-200',
                    active ? 'border-[#2a78d6] shadow-[0_0_0_3px_#2a78d626]' : 'border-border-strong hover:border-foreground-subtle',
                    node.grantedBy === 0 && !active && 'border-dashed',
                    dimmed && 'opacity-35',
                  )}
                  style={{ left: x, top: y, width: w, height: h }}
                >
                  <span
                    aria-hidden
                    className="size-2.5 shrink-0 rounded-full"
                    style={band ? { backgroundColor: band.color } : { boxShadow: 'inset 0 0 0 1.5px var(--chart-ink)' }}
                  />
                  <span className="line-clamp-2 min-w-0 text-[12.5px] leading-tight text-foreground">
                    <b className="font-semibold">#{numbers.get(node.code)}</b> {node.name}
                  </span>
                </button>
              );
            })}

            {focusBox && (
              <NodeTooltip
                box={focusBox}
                containerWidth={width}
                containerHeight={height}
                number={numbers.get(focusBox.node.code)}
                bands={bands}
                drawn={level.edges.filter((edge) => edge.from === focusBox.node.code || edge.to === focusBox.node.code).length}
                href={focusBox.node.code === pinned ? hrefOf?.(focusBox.node.code) : undefined}
              />
            )}
          </div>
        )}
      </div>

      {critical && lowBands.length > 0 && (
        <p className="text-[12.5px] text-foreground-muted">
          En color, las relaciones que quien depende califica en {lowBands.map((band) => band.label.toLowerCase()).join(' o ')}.
        </p>
      )}
    </div>
  );
}

const STRENGTH_LABEL = { 1: 'débil', 2: 'media', 3: 'fuerte' } as const;

/** La red en un teléfono: las capas una debajo de otra y, en cada nodo, sus relaciones escritas. */
function CompactNetwork({
  nodes,
  edges,
  numbers,
  bands,
  critical,
  hrefOf,
}: {
  nodes: InfluenceNode[];
  edges: InfluenceEdge[];
  numbers: Map<string, number>;
  bands: ThresholdBand[];
  critical: boolean;
  hrefOf?: (code: string) => string | undefined;
}) {
  const names = new Map(nodes.map((node) => [node.code, node.name]));
  const groups = [
    { title: 'Motrices', hint: 'mueven', zone: 'MOTRIZ' },
    { title: 'De enlace', hint: 'transmiten', zone: 'ENLACE' },
    { title: 'Dependientes', hint: 'resienten', zone: 'DEPENDIENTE' },
    { title: 'Autónomas', hint: 'mueven y dependen poco', zone: 'AUTONOMA' },
  ]
    .map((group) => ({ ...group, nodes: nodes.filter((node) => node.zone === group.zone) }))
    .filter((group) => group.nodes.length > 0);

  const relations = (label: string, list: { code: string; edge: InfluenceEdge }[]) => (
    <p className="mt-1 pl-[18px] text-[12.5px] leading-relaxed text-foreground-muted">
      {label}:{' '}
      {list.map(({ code, edge }, index) => {
        const band = critical && isLowScore(edge.irel, bands) ? classify(edge.irel, bands) : null;
        return (
          <span key={code}>
            {index > 0 && ', '}
            {band && (
              <span aria-hidden className="mr-1 inline-block size-2 rounded-full align-middle" style={{ backgroundColor: band.color }} />
            )}
            <span className="text-foreground">
              #{numbers.get(code)} {names.get(code)}
            </span>{' '}
            ({STRENGTH_LABEL[edge.strength]}
            {band ? `, ${band.label.toLowerCase()}` : ''})
          </span>
        );
      })}
    </p>
  );

  return (
    <div className="flex flex-col gap-5">
      {groups.map((group) => (
        <section key={group.zone} className="flex flex-col gap-2">
          <p className="text-[11px] font-semibold tracking-[0.12em] text-foreground-subtle uppercase">
            {group.title}
            <span className="ml-1.5 font-normal tracking-normal normal-case">· {group.hint}</span>
          </p>
          <ul className="flex flex-col gap-2">
            {group.nodes.map((node) => {
              const band = classify(node.irelReceived, bands);
              const href = hrefOf?.(node.code);
              const moves = edges.filter((edge) => edge.from === node.code).map((edge) => ({ code: edge.to, edge }));
              const movedBy = edges.filter((edge) => edge.to === node.code).map((edge) => ({ code: edge.from, edge }));
              const name = (
                <>
                  <b className="font-semibold">#{numbers.get(node.code)}</b> {node.name}
                </>
              );
              return (
                <li
                  key={node.code}
                  className={clsx(
                    'rounded-xl border border-border-strong bg-white px-3 py-2.5',
                    node.grantedBy === 0 && 'border-dashed',
                  )}
                >
                  <p className="flex items-center gap-2 text-[13px] leading-snug text-foreground">
                    <span
                      aria-hidden
                      className="size-2.5 shrink-0 rounded-full"
                      style={band ? { backgroundColor: band.color } : { boxShadow: 'inset 0 0 0 1.5px var(--chart-ink)' }}
                    />
                    {href ? (
                      <Link href={href} className="hover:underline">
                        {name}
                      </Link>
                    ) : (
                      <span>{name}</span>
                    )}
                  </p>
                  {moves.length > 0 && relations('Mueve a', moves)}
                  {movedBy.length > 0 && relations('La mueven', movedBy)}
                  {moves.length === 0 && movedBy.length === 0 && (
                    <p className="mt-1 pl-[18px] text-[12.5px] text-foreground-subtle">Sin relaciones visibles</p>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

function Toggle({
  pressed,
  onChange,
  children,
}: {
  pressed: boolean;
  onChange: (value: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={() => onChange(!pressed)}
      className={clsx(
        'inline-flex min-h-9 items-center rounded-full border px-3.5 text-[13px] font-medium transition-colors',
        pressed
          ? 'border-navy-900 bg-navy-900 text-white'
          : 'border-border-strong bg-white text-foreground-muted hover:text-foreground',
      )}
    >
      {children}
    </button>
  );
}

function NodeTooltip({
  box,
  containerWidth,
  containerHeight,
  number,
  bands,
  drawn,
  href,
}: {
  box: Box;
  containerWidth: number;
  containerHeight: number;
  number: number | undefined;
  bands: ThresholdBand[];
  drawn: number;
  href?: string;
}) {
  const { node } = box;
  const band = classify(node.irelReceived, bands);
  const total = node.clients + node.providers;
  const tooltipWidth = 264;
  const left = Math.min(Math.max(box.x, 0), containerWidth - tooltipWidth);
  // Debajo del nodo, o encima si no cabe antes del borde inferior.
  const below = box.y + box.h + 170 < containerHeight;
  return (
    <div
      role="status"
      className={clsx(
        'absolute z-20 rounded-xl bg-navy-900 px-3.5 py-2.5 text-xs text-slate-200 shadow-[0_12px_32px_-12px_#06142b99]',
        href ? 'pointer-events-auto' : 'pointer-events-none',
      )}
      style={{
        left,
        width: tooltipWidth,
        top: below ? box.y + box.h + 8 : undefined,
        bottom: below ? undefined : containerHeight - box.y + 8,
      }}
    >
      <p className="font-semibold text-white">
        #{number} · {node.name}
      </p>
      {node.groupName && <p className="text-slate-400">{node.groupName}</p>}
      <div className="mt-1.5 flex flex-col gap-0.5">
        <p>
          La buscan <span className="font-semibold text-white tabular-nums">{node.clients}</span> · motricidad{' '}
          <span className="tabular-nums">{node.motricidad}</span>
        </p>
        {node.grantedBy > 0 ? (
          <p>
            Busca a <span className="font-semibold text-white tabular-nums">{node.providers}</span> · dependencia{' '}
            <span className="tabular-nums">{node.dependencia}</span>
          </p>
        ) : (
          <p className="text-slate-300">Dependencia sin medir: nadie de ella evaluó a otras</p>
        )}
        <p>
          Zona <span className="font-semibold text-white">{ZONE_LABELS[node.zone].toLowerCase()}</span>
        </p>
        <p>
          Relacionamiento recibido{' '}
          {node.irelReceived !== null ? (
            <>
              <span className="font-semibold text-white tabular-nums">{formatIndex(node.irelReceived, 1)}</span>
              {band && ` · ${band.label}`}
            </>
          ) : (
            <span className="text-slate-300">{node.receivedFrom > 0 ? 'oculto por cohorte' : 'sin evaluaciones'}</span>
          )}
        </p>
        {drawn < total && (
          <p className="text-slate-400">
            Se dibujan {drawn} de sus {total} relaciones: las demás no alcanzan la cohorte.
          </p>
        )}
      </div>
      {href && (
        <Link href={href} className="mt-2 inline-flex font-semibold text-[#7cc4ff] hover:underline">
          Abrir la ficha →
        </Link>
      )}
    </div>
  );
}
