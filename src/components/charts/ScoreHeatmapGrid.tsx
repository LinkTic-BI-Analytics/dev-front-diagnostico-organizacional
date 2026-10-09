import type { AspectMatrixRow, ThresholdBand } from '@/lib/admin.types';
import { ASPECT_LABELS } from '@/lib/admin.types';
import { classify, formatIndex, heatFill } from '@/lib/score-scale';
import { EmptyState } from './InsufficientData';
import { MatrixLegend } from './RelationshipMatrixView';

/**
 * Los cinco aspectos del componente 2 por área evaluada.
 *
 * Es lo que distingue un área que falla en comunicación de una que falla en cumplimiento:
 * el índice agregado los promedia y borra esa diferencia, que es justo la que orienta un
 * plan de mejora.
 */
export function ScoreHeatmapGrid({
  rows,
  bands,
}: {
  rows: AspectMatrixRow[];
  bands: ThresholdBand[];
}) {
  if (rows.length === 0) {
    return <EmptyState message="Sin evaluaciones por aspecto todavía." />;
  }

  const aspectKeys = Object.keys(ASPECT_LABELS);

  return (
    <div className="flex flex-col gap-3">
      <div className="relative overflow-x-auto">
        <table className="w-full min-w-[620px] border-collapse text-sm">
          <caption className="sr-only">
            Calificación de cada aspecto de la red de colaboración, por área evaluada
          </caption>
          <thead>
            <tr>
              <th scope="col" className="p-2 text-left text-xs font-medium text-foreground-muted">
                Área evaluada
              </th>
              {aspectKeys.map((key) => (
                <th key={key} scope="col" className="p-2 text-center text-xs font-medium text-foreground">
                  {ASPECT_LABELS[key]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.areaCode}>
                <th scope="row" className="p-2 text-left text-xs font-medium text-foreground">
                  {row.areaName}
                  <span className="ml-1.5 font-normal text-foreground-muted">
                    ({row.respondents})
                  </span>
                </th>
                {aspectKeys.map((key) => {
                  const value = row.aspects[key] ?? null;
                  const band = classify(value, bands);
                  return (
                    <td key={key} className="p-0.5">
                      <div
                        className="rounded px-2 py-2 text-center text-foreground"
                        style={heatFill(band, bands)}
                        title={`${row.areaName} · ${ASPECT_LABELS[key]}: ${formatIndex(value, 1)} (${band?.label ?? 'sin dato'})`}
                      >
                        <span className="text-sm font-bold tabular-nums">
                          {formatIndex(value)}
                        </span>
                        <span className="sr-only"> · {band?.label ?? 'sin dato'}</span>
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
    </div>
  );
}
