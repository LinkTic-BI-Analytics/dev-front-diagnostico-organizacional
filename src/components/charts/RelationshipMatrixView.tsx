'use client';

import type { RelationshipPayload, ThresholdBand } from '@/lib/admin.types';
import { classify, formatIndex, heatFill } from '@/lib/score-scale';
import { EmptyState } from './InsufficientData';

interface Props {
  payload: RelationshipPayload;
  bands: ThresholdBand[];
}

/**
 * Mapa de relacionamiento como matriz área evaluadora × área evaluada.
 *
 * Se representa como tabla y no como grafo a propósito: con siete áreas el grafo se vuelve
 * una maraña de aristas cruzadas, mientras que la matriz permite leer una fila ("cómo
 * evalúa PMO a las demás") o una columna ("cómo evalúan a PMO") de un vistazo. Y siendo
 * una tabla real, es navegable y legible por un lector de pantalla.
 */
export function RelationshipMatrixView({ payload, bands }: Props) {
  const { map, suppressedCells } = payload;
  const areas = map.areas;

  if (map.cells.length === 0) {
    // «No hay evaluaciones» y «las hay pero están todas ocultas» son cosas distintas, y
    // con más de cincuenta subprocesos la segunda es la normal: miles de pares posibles
    // contra una cohorte mínima de 4 deja casi todas las celdas por debajo del umbral.
    // Las cifras salen del catálogo, para que no envejezcan con el próximo organigrama.
    const pairs = areas.length * (areas.length - 1);
    return (
      <EmptyState
        message={
          suppressedCells > 0
            ? `Las ${suppressedCells} relaciones evaluadas están ocultas: ninguna pareja de áreas alcanza todavía la cohorte mínima. Con ${areas.length} subprocesos hay ${pairs.toLocaleString('es-CO')} parejas posibles, así que este corte se lee mejor por gestión que par a par.`
            : 'Todavía no hay evaluaciones entre áreas para construir la matriz.'
        }
      />
    );
  }

  const byPair = new Map(
    map.cells.map((cell) => [`${cell.sourceArea}|${cell.targetArea}`, cell]),
  );

  return (
    <div className="flex flex-col gap-3">
      {/* La tabla es ancha por naturaleza: el scroll vive en su contenedor, nunca en la
          página. */}
      <div className="relative overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <caption className="sr-only">
            Índice de relacionamiento por área evaluadora y área evaluada
          </caption>
          <thead>
            <tr>
              <th
                scope="col"
                className="sticky left-0 z-10 bg-surface p-2 text-left text-xs font-medium text-foreground-muted"
              >
                Evalúa ↓ · Evaluada →
              </th>
              {areas.map((area) => (
                <th
                  key={area.code}
                  scope="col"
                  className="p-2 text-center text-xs font-medium text-foreground"
                >
                  {area.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {areas.map((source) => (
              <tr key={source.code}>
                <th
                  scope="row"
                  className="sticky left-0 z-10 bg-surface p-2 text-left text-xs font-medium text-foreground"
                >
                  {source.name}
                </th>
                {areas.map((target) => {
                  const cell = byPair.get(`${source.code}|${target.code}`);
                  const isDiagonal = source.code === target.code;
                  const band = classify(cell?.irel ?? null, bands);

                  if (isDiagonal) {
                    return (
                      <td
                        key={target.code}
                        className="bg-surface-muted p-1 text-center text-xs text-foreground-muted"
                        aria-label="Un área no se evalúa a sí misma"
                      >
                        —
                      </td>
                    );
                  }

                  if (!cell || cell.irel === null) {
                    return (
                      <td
                        key={target.code}
                        className="p-1 text-center text-xs text-foreground-muted"
                      >
                        <span className="sr-only">Sin datos</span>·
                      </td>
                    );
                  }

                  return (
                    <td key={target.code} className="p-0.5">
                      {/* Velo del color de banda, no el color a plena carga: con decenas de
                          áreas la cuadrícula entera en bloques saturados se vuelve ilegible. */}
                      <div
                        className="rounded px-2 py-2 text-center text-foreground"
                        style={heatFill(band, bands)}
                        title={`${source.name} evalúa a ${target.name}: ${formatIndex(cell.irel, 1)} (${band?.label ?? 'sin banda'}) · ${cell.respondents} respuestas`}
                      >
                        <span className="text-sm font-bold tabular-nums">
                          {formatIndex(cell.irel)}
                        </span>
                        <span className="sr-only"> · {band?.label ?? 'sin banda'}</span>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <MatrixLegend bands={bands} />

      {suppressedCells > 0 && (
        <p className="text-xs text-foreground-muted">
          {suppressedCells}{' '}
          {suppressedCells === 1 ? 'relación oculta' : 'relaciones ocultas'} por tener menos
          respuestas que la cohorte mínima.
        </p>
      )}
    </div>
  );
}

/** Leyenda de bandas: el color nunca queda solo, siempre con su nombre. */
export function MatrixLegend({ bands }: { bands: ThresholdBand[] }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1.5">
      {bands.map((band) => (
        <li key={band.label} className="flex items-center gap-1.5 text-xs">
          <span
            aria-hidden
            className="h-2.5 w-2.5 shrink-0 rounded-sm ring-1 ring-black/10"
            style={{ backgroundColor: band.color }}
          />
          <span className="text-foreground">{band.label}</span>
          <span className="text-foreground-muted">
            {band.minValue}–{Math.round(band.maxValue)}
          </span>
        </li>
      ))}
    </ul>
  );
}
