'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import { getMonitoring, getRelationshipMap } from '@/lib/admin-client';
import { coverageInsight, rankingInsight } from '@/lib/insights';
import { classify, formatIndex } from '@/lib/score-scale';
import { useCatalog } from '@/lib/use-catalog';
import { useThresholds } from '@/lib/use-thresholds';
import { Icon } from '@/components/ui/icons';
import { InsightTitle, PageBody, PageHeader, StatGrid } from '@/components/page/PageHeader';
import { LoadingCard } from '@/components/charts/EnvelopeGate';

/**
 * Todas las áreas, por gestión: la puerta a cada ficha.
 *
 * Cada tarjeta dice lo mínimo para decidir si abrirla —cuánto la valoran las demás y si ya
 * tiene respuestas suficientes de su propia gente— y la ficha completa queda a un clic.
 * El orden es el del organigrama, no el del ranking: aquí se busca un área, no se compara.
 */
export default function AreasPage() {
  const { gestiones, areaCount, isLoading } = useCatalog();
  const map = useQuery({ queryKey: ['relationship-map'], queryFn: () => getRelationshipMap() });
  const monitoring = useQuery({ queryKey: ['monitoring'], queryFn: () => getMonitoring() });
  const bands = useThresholds();

  const ranking = new Map((map.data?.data?.ranking ?? []).map((row) => [row.areaCode, row]));
  const propias = new Map((monitoring.data?.data?.byArea ?? []).map((row) => [row.areaCode, row]));
  const minCohort = monitoring.data?.meta.minCohortSize ?? map.data?.meta.minCohortSize ?? 4;
  const titular = map.data?.data ? rankingInsight(map.data.data.ranking, map.data.data.suppressedRanking) : null;
  const cobertura = monitoring.data?.data ? coverageInsight(monitoring.data.data.byArea, minCohort) : null;

  return (
    <>
      <PageHeader
        variant="hero"
        breadcrumbs={[{ label: 'Diagnóstico', href: '/admin' }, { label: 'Áreas' }]}
        kicker="Áreas · mapa comparativo"
        title={titular ? <InsightTitle insight={titular} /> : 'Las áreas de LinkTIC, una por una'}
        lede={cobertura ? `${cobertura.headline}. ${cobertura.detail ?? ''}` : undefined}
        stats={
          <StatGrid
            onDark
            items={[
              { label: 'Subprocesos evaluables', value: String(areaCount || '—') },
              { label: 'Gestiones', value: String(gestiones.length || '—') },
              {
                label: 'Publicadas en el ranking',
                value: map.data?.data ? String(map.data.data.ranking.length) : '—',
                hint: 'Con evaluaciones suficientes de las demás',
              },
              {
                label: 'Con respuestas propias suficientes',
                value: monitoring.data?.data
                  ? String(monitoring.data.data.byArea.filter((row) => row.areaCode !== 'OTRA' && row.completed >= minCohort).length)
                  : '—',
                hint: `${minCohort} o más encuestas de su gente`,
              },
            ]}
          />
        }
      />

      <PageBody>
        {isLoading ? (
          <LoadingCard height={300} />
        ) : (
          gestiones.map((gestion) => (
            <section key={gestion.code} className="flex flex-col gap-3" aria-labelledby={`g-${gestion.code}`}>
              <div className="flex items-baseline justify-between gap-3">
                <h2 id={`g-${gestion.code}`} className="text-lg text-foreground">
                  {gestion.shortName}
                </h2>
                <span className="text-sm text-foreground-subtle">
                  {gestion.areas.length} {gestion.areas.length === 1 ? 'subproceso' : 'subprocesos'}
                </span>
              </div>
              <ul className="lk-escalonado grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {gestion.areas.map((area) => {
                  const fila = ranking.get(area.code);
                  const band = classify(fila?.irel ?? null, bands);
                  const propia = propias.get(area.code);
                  const lista = (propia?.completed ?? 0) >= minCohort;

                  return (
                    <li key={area.code}>
                      <Link
                        href={`/admin/areas/${area.code}`}
                        className="lk-tarjeta group flex h-full flex-col gap-3 p-5 transition-shadow hover:shadow-[0_0_0_1px_#0e8fd855,0_14px_32px_-18px_#0a6cb166]"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-[15px] font-semibold leading-snug text-foreground">{area.name}</p>
                          <Icon
                            name="arrowUpRight"
                            size={16}
                            className="mt-0.5 shrink-0 text-foreground-subtle transition-colors group-hover:text-brand"
                          />
                        </div>
                        {fila ? (
                          <p className="flex flex-wrap items-baseline gap-x-2">
                            <span className="text-3xl font-semibold tracking-tight text-foreground">
                              {formatIndex(fila.irel, 1)}
                            </span>
                            <span className="inline-flex items-center gap-1.5 text-sm text-foreground-muted">
                              <span
                                aria-hidden
                                className="size-2 rounded-full"
                                style={{ backgroundColor: band?.color ?? 'var(--border-strong)' }}
                              />
                              {band?.label ?? 'sin banda'} · recibido
                            </span>
                          </p>
                        ) : (
                          <p className="text-sm text-foreground-muted">
                            Relacionamiento oculto: aún no la evalúan suficientes personas.
                          </p>
                        )}
                        <p
                          className={clsx(
                            'mt-auto inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
                            lista ? 'bg-tone-good-subtle text-tone-good' : 'bg-surface-muted text-foreground-muted',
                          )}
                        >
                          <Icon name={lista ? 'check' : 'users'} size={13} strokeWidth={2.2} />
                          {propia ? `${propia.completed} ${propia.completed === 1 ? 'encuesta propia' : 'encuestas propias'}` : 'Sin dato de participación'}
                        </p>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))
        )}
      </PageBody>
    </>
  );
}
