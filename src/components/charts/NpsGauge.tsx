import type { NpsResult } from '@/lib/admin.types';
import { formatNps } from '@/lib/score-scale';
import { Legend } from './ChartCard';
import { stagger } from './chart-utils';

/**
 * Los tres segmentos del NPS son estados (bueno, intermedio, malo), así que van en la
 * paleta de estado —reservada para eso y nunca usada por una serie— y siempre con su
 * etiqueta: el ámbar de los pasivos no llega a 3:1 sobre blanco por diseño, y la palabra
 * es la que lo hace legible.
 */
export const NPS_SEGMENTS = [
  { key: 'promoters', label: 'Promotores', hint: '9-10', color: '#0ca30c' },
  { key: 'passives', label: 'Pasivos', hint: '7-8', color: '#fab219' },
  { key: 'detractors', label: 'Detractores', hint: '0-6', color: '#d03b3b' },
] as const;

/**
 * NPS con su desglose.
 *
 * Se muestra la composición y no solo el número porque un NPS de 0 puede ser "todos
 * pasivos" o "mitad promotores, mitad detractores", y son diagnósticos opuestos.
 */
export function NpsGauge({ nps }: { nps: NpsResult }) {
  const total = nps.total;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-baseline gap-2">
        <span className="text-5xl font-semibold tracking-tight text-foreground">
          {formatNps(nps.value)}
        </span>
        <span className="text-sm text-foreground-subtle">NPS · de −100 a +100</span>
      </div>

      {total === 0 ? (
        <p className="text-sm text-foreground-muted">Sin calificaciones registradas.</p>
      ) : (
        <>
          {/* 2 px de superficie entre segmentos: sin el hueco, dos colores contiguos se leen
              como una sola banda. */}
          <div className="flex h-3.5 w-full gap-0.5">
            {NPS_SEGMENTS.map((segment, index) => {
              const count = nps[segment.key];
              const share = (count / total) * 100;
              if (share === 0) return null;
              return (
                <div
                  key={segment.key}
                  className="lk-graf-barra first:rounded-l last:rounded-r"
                  style={{ width: `${share}%`, backgroundColor: segment.color, ...stagger(index, 0.1) }}
                  title={`${segment.label}: ${count} (${Math.round(share)} %)`}
                />
              );
            })}
          </div>

          <Legend
            items={NPS_SEGMENTS.map((segment) => {
              const count = nps[segment.key];
              const share = Math.round((count / total) * 100);
              return {
                label: segment.label,
                color: segment.color,
                hint: `${segment.hint} · ${count} (${share} %)`,
              };
            })}
          />

        </>
      )}
    </div>
  );
}
