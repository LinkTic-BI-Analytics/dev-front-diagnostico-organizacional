import type { IndicesByAreaPayload, ThresholdBand } from '@/lib/admin.types';
import { classify, formatIndex, heatFill } from '@/lib/score-scale';
import { EmptyState } from './InsufficientData';
import { MatrixLegend } from './RelationshipMatrixView';

/**
 * Los índices según el área a la que pertenece quien respondió.
 *
 * Como tabla de números es una hoja de cálculo: hay que leerla celda por celda para
 * encontrar el problema. Con el velo de color el parche salta a la vista, y lo que importa
 * aquí es justo eso — si la percepción crítica se concentra en un área o está repartida.
 *
 * Sigue siendo una tabla real, con encabezados de fila y columna, así que un lector de
 * pantalla la recorre y el número está siempre escrito: el color no es el único canal.
 */
export function IndicesHeatTable({
  payload,
  columns,
  labels,
  bands,
  rowHeader = 'Área de quien responde',
  emptyMessage = 'Ningún área alcanza la cohorte mínima para desglosarse.',
  suppressedNoun = { one: 'área oculta', other: 'áreas ocultas' },
}: {
  payload: IndicesByAreaPayload;
  columns: string[];
  labels: Record<string, string>;
  bands: ThresholdBand[];
  /** El encabezado de la columna de filas: área de origen, nivel de cargo… */
  rowHeader?: string;
  emptyMessage?: string;
  suppressedNoun?: { one: string; other: string };
}) {
  if (payload.rows.length === 0) {
    return <EmptyState message={emptyMessage} />;
  }

  const media = (indicators: Record<string, number | null>) => {
    const valores = columns
      .map((code) => indicators[code])
      .filter((value): value is number => typeof value === 'number');
    return valores.length ? valores.reduce((s, v) => s + v, 0) / valores.length : null;
  };

  // De la más crítica a la más conforme: la primera fila es la que hay que mirar.
  const filas = [...payload.rows]
    .map((row) => ({ ...row, media: media(row.indicators) }))
    .sort((a, b) => (a.media ?? 999) - (b.media ?? 999));

  return (
    <div className="flex flex-col gap-3">
      <div className="relative overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-sm">
          <caption className="sr-only">
            Índices según el área de origen de quien respondió, de la más crítica a la más
            conforme
          </caption>
          <thead>
            <tr>
              <th
                scope="col"
                className="sticky left-0 z-10 bg-surface p-2 text-left text-xs font-medium text-foreground-muted"
              >
                {rowHeader}
              </th>
              <th scope="col" className="p-2 text-right text-xs font-medium text-foreground-muted">
                n
              </th>
              <th scope="col" className="p-2 text-center text-xs font-medium text-foreground">
                Media
              </th>
              {columns.map((code) => (
                <th
                  key={code}
                  scope="col"
                  className="p-2 text-center text-xs font-medium text-foreground"
                  title={labels[code] ?? code}
                >
                  {code}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filas.map((row) => {
              const bandaMedia = classify(row.media, bands);
              return (
                <tr key={row.areaCode}>
                  <th
                    scope="row"
                    className="sticky left-0 z-10 bg-surface p-2 text-left text-xs font-medium text-foreground"
                  >
                    {row.areaName}
                  </th>
                  <td className="p-2 text-right text-xs tabular-nums text-foreground-muted">
                    {row.respondents}
                  </td>
                  <td className="p-0.5">
                    <div
                      className="rounded px-2 py-2 text-center text-foreground"
                      style={heatFill(bandaMedia, bands)}
                      title={`Media de ${row.areaName}: ${formatIndex(row.media, 1)} (${bandaMedia?.label ?? 'sin banda'})`}
                    >
                      <span className="text-sm font-bold tabular-nums">
                        {formatIndex(row.media)}
                      </span>
                      <span className="sr-only"> · {bandaMedia?.label ?? 'sin banda'}</span>
                    </div>
                  </td>
                  {columns.map((code) => {
                    const value = row.indicators[code] ?? null;
                    const band = classify(value, bands);
                    return (
                      <td key={code} className="p-0.5">
                        <div
                          className="rounded px-2 py-2 text-center text-foreground"
                          style={heatFill(band, bands)}
                          title={`${row.areaName} · ${labels[code] ?? code}: ${formatIndex(value, 1)} (${band?.label ?? 'sin dato'})`}
                        >
                          <span className="text-sm tabular-nums">{formatIndex(value)}</span>
                          <span className="sr-only"> · {band?.label ?? 'sin dato'}</span>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <MatrixLegend bands={bands} />

      {payload.suppressed > 0 && (
        <p className="text-xs text-foreground-muted">
          {payload.suppressed}{' '}
          {payload.suppressed === 1 ? suppressedNoun.one : suppressedNoun.other} por tener menos
          respuestas que la cohorte mínima.
        </p>
      )}
    </div>
  );
}
