'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { getAreaDetail, getMonitoring, getRelationshipMap } from '@/lib/admin-client';
import { ASPECT_LABELS } from '@/lib/admin.types';
import type { AreaDetailPayload, AspectMatrixRow, ThresholdBand } from '@/lib/admin.types';
import { npsInsight, toneOfBand, type Insight } from '@/lib/insights';
import { classify, formatIndex, formatNps, formatNumber, formatSigned } from '@/lib/score-scale';
import { useAnalysisFilters } from '@/lib/filters-store';
import { useCatalog } from '@/lib/use-catalog';
import { useThresholds } from '@/lib/use-thresholds';
import { Icon } from '@/components/ui/icons';
import { FilterBar } from '@/components/page/FilterBar';
import { PageBody, PageHeader, PrintButton, StatGrid, CONTAINER } from '@/components/page/PageHeader';
import { BarRanking } from '@/components/charts/BarRanking';
import { ChartCard, Legend } from '@/components/charts/ChartCard';
import { DataTable } from '@/components/charts/DataTable';
import { EnvelopeGate, LoadingCard } from '@/components/charts/EnvelopeGate';
import { IndicatorMeters } from '@/components/charts/IndicatorMeter';
import { NpsGauge } from '@/components/charts/NpsGauge';

/**
 * La ficha de un área: cómo la evalúan las demás, cómo evalúa ella, en qué aspecto falla
 * frente al promedio de la empresa y dónde queda en el ranking.
 *
 * Abre con la portada aunque el área no tenga dato todavía: el nombre, la gestión y el
 * selector salen del catálogo, así que se puede navegar entre fichas incluso cuando la
 * cohorte mínima esconde los números.
 */
export default function AreaDetailPage({ params }: PageProps<'/admin/areas/[area]'>) {
  // En Next 16 los params son una promesa; `use` los desenvuelve en el cliente.
  const { area } = use(params);
  const router = useRouter();
  const { apiFilters } = useAnalysisFilters();
  const query = useQuery({ queryKey: ['area', area, apiFilters], queryFn: () => getAreaDetail(area, apiFilters) });
  const map = useQuery({
    queryKey: ['relationship-map', apiFilters],
    queryFn: () => getRelationshipMap(apiFilters),
  });
  const monitoring = useQuery({ queryKey: ['monitoring'], queryFn: () => getMonitoring() });
  const bands = useThresholds();
  const { gestiones } = useCatalog();

  const gestion = gestiones.find((entry) => entry.areas.some((item) => item.code === area));
  const catalogArea = gestion?.areas.find((item) => item.code === area);
  const data = query.data?.data ?? null;
  const nombre = data?.area.name ?? catalogArea?.name ?? 'Ficha de área';
  const lectura = data ? areaInsight(data, bands) : null;
  const propias = monitoring.data?.data?.byArea.find((row) => row.areaCode === area);

  return (
    <>
      <PageHeader
        variant="hero"
        breadcrumbs={[
          { label: 'Áreas', href: '/admin/areas' },
          ...(gestion ? [{ label: gestion.shortName, href: '/admin/areas' }] : []),
          { label: nombre },
        ]}
        kicker={`Ficha de área${gestion ? ` · ${gestion.shortName}` : ''}`}
        title={nombre}
        lede={
          lectura
            ? `${lectura.headline}${lectura.detail ? ` ${lectura.detail}` : ''}`
            : query.data?.meta.insufficient
              ? `Todavía no hay suficientes evaluaciones sobre esta área para publicarlas: hacen falta al menos ${query.data.meta.minCohortSize}.`
              : undefined
        }
        actions={<PrintButton onDark />}
        stats={
          data && (
            <StatGrid
              onDark
              items={[
                {
                  label: 'Relacionamiento recibido',
                  value: formatIndex(data.gap?.received ?? null, 1),
                  unit: 'de 100',
                  tag: data.gapBand ? { label: data.gapBand.label, color: data.gapBand.color } : null,
                },
                {
                  label: 'Otorga a las demás',
                  value: formatIndex(data.gap?.granted ?? null, 1),
                  hint: 'Promedio que esta área da',
                },
                {
                  label: 'Brecha de percepción',
                  value: formatSigned(data.gap?.gap ?? null),
                  hint: 'Recibido menos otorgado',
                },
                {
                  label: 'NPS recibido',
                  value: formatNps(data.nps.value),
                  hint: `${data.nps.total} calificaciones`,
                },
              ]}
            />
          )
        }
        footer={
          propias && (
            <p className="flex flex-wrap items-center gap-2 text-sm text-slate-300">
              <span className="lk-vidrio inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[13px] text-white">
                <Icon name="users" size={14} />
                {propias.completed} {propias.completed === 1 ? 'encuesta completa' : 'encuestas completas'} de su gente
              </span>
              {propias.headcount !== null && (
                <span className="lk-vidrio inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[13px] text-white">
                  {propias.headcount} personas en el área
                </span>
              )}
            </p>
          )
        }
      />

      {/* El selector de ficha: saltar de un área a otra sin volver al menú. */}
      <div className={`${CONTAINER} lk-no-imprimir pt-6`}>
        <label className="flex max-w-md flex-col gap-1.5">
          <span className="sr-only">Cambiar de área</span>
          <span className="relative">
            <select
              value={area}
              onChange={(event) => router.push(`/admin/areas/${event.target.value}`)}
              className="min-h-12 w-full appearance-none rounded-full border border-border-strong bg-surface pr-11 pl-5 text-[15px] text-foreground shadow-[0_1px_2px_#0f172a0d] hover:border-brand"
            >
              {gestiones.map((entry) => (
                <optgroup key={entry.code} label={entry.shortName}>
                  {entry.areas.map((item) => (
                    <option key={item.code} value={item.code}>
                      {item.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <Icon
              name="chevronDown"
              size={18}
              className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-foreground-subtle"
            />
          </span>
        </label>
      </div>

      <PageBody className="pt-6">
        <FilterBar note="la ficha se recalcula con lo que se filtre aquí" />
        <EnvelopeGate query={query} loading={<LoadingCard height={360} />}>
          {(detalle) => {
            const empresa = map.data?.data ? companyAspects(map.data.data.aspects) : null;
            const aspectos = Object.keys(ASPECT_LABELS)
              .map((code) => ({
                key: code,
                label: ASPECT_LABELS[code],
                value: detalle.aspects?.aspects[code] ?? null,
                benchmark: empresa?.[code] ?? null,
              }))
              .sort((a, b) => (a.value ?? 999) - (b.value ?? 999));

            const ranking = map.data?.data?.ranking ?? [];
            const posicion = ranking.findIndex((row) => row.areaCode === area);

            return (
              <>
                <ChartCard
                  accent
                  insight={aspectDetailInsight(detalle, bands)}
                  subtitle="Los cinco aspectos que las otras áreas califican sobre esta, frente al promedio de la empresa"
                  legend={
                    <Legend
                      items={[
                        { label: 'Esta área', color: 'var(--series-1)' },
                        { label: 'Promedio de la empresa', color: 'var(--chart-benchmark)', shape: 'tick' },
                      ]}
                    />
                  }
                  views={[
                    {
                      id: 'grafica',
                      label: 'Gráfica',
                      content: detalle.aspects ? (
                        <IndicatorMeters bands={bands} rows={aspectos} />
                      ) : (
                        <p className="text-sm text-foreground-muted">Sin evaluaciones por aspecto todavía.</p>
                      ),
                    },
                    {
                      id: 'tabla',
                      label: 'Tabla',
                      content: (
                        <DataTable
                          caption="Aspectos del área frente a la empresa"
                          rowKey={(row) => row.key}
                          rows={aspectos}
                          minWidth={380}
                          columns={[
                            { key: 'aspecto', header: 'Aspecto', render: (row) => row.label },
                            { key: 'area', header: 'Esta área', render: (row) => formatIndex(row.value, 1) },
                            { key: 'empresa', header: 'Empresa', render: (row) => formatIndex(row.benchmark, 1) },
                            {
                              key: 'dif',
                              header: 'Diferencia',
                              render: (row) =>
                                row.value === null || row.benchmark === null ? '—' : formatSigned(row.value - row.benchmark),
                            },
                          ]}
                        />
                      ),
                    },
                  ]}
                  howToRead={
                    <p>
                      La barra es la nota que las demás áreas le dan a esta en cada aspecto; la marca
                      vertical, el promedio de todas las áreas publicadas. Una barra que no llega a
                      la marca es un aspecto donde esta área está por debajo de lo típico en LinkTIC.
                    </p>
                  }
                />

                <div className="grid gap-6 xl:grid-cols-2 xl:items-start">
                  <ChartCard insight={npsInsight(detalle.nps)} subtitle="Qué tan probable es que la recomienden">
                    <NpsGauge nps={detalle.nps} />
                  </ChartCard>

                  <ChartCard
                    title={
                      posicion >= 0
                        ? `Ocupa el puesto ${posicion + 1} de ${ranking.length} en relacionamiento recibido`
                        : 'Su lugar en el ranking de relacionamiento'
                    }
                    subtitle="Relacionamiento que recibe cada área publicada; esta área, destacada"
                  >
                    <BarRanking
                      max={100}
                      href={(row) => `/admin/areas/${row.key}`}
                      rows={ranking.map((row) => ({
                        key: row.areaCode,
                        label: row.areaName,
                        value: row.irel,
                        color: row.areaCode === area ? 'var(--series-1)' : 'var(--seq-200)',
                      }))}
                      emptyMessage="Ningún área alcanza todavía la cohorte mínima para publicarse."
                    />
                  </ChartCard>
                </div>
              </>
            );
          }}
        </EnvelopeGate>
      </PageBody>
    </>
  );
}

/** El promedio de la empresa en cada aspecto, sobre las áreas que se pueden publicar. */
function companyAspects(rows: AspectMatrixRow[]): Record<string, number | null> {
  return Object.fromEntries(
    Object.keys(ASPECT_LABELS).map((code) => {
      const values = rows
        .map((row) => row.aspects[code])
        .filter((value): value is number => typeof value === 'number');
      return [code, values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null];
    }),
  );
}

/** Qué significa la brecha de ESTA área, dicho en una frase. */
function areaInsight(data: AreaDetailPayload, bands: ThresholdBand[]): Insight {
  const { gap } = data;
  if (!gap || gap.received === null) {
    return { tone: 'neutral', headline: 'Todavía no hay evaluaciones suficientes sobre esta área.' };
  }

  const tone = toneOfBand(data.gapBand, bands);
  const banda = data.gapBand?.label ?? 'sin banda';

  if (gap.gap === null) {
    return {
      tone,
      headline: `Las demás áreas la califican en ${formatNumber(gap.received, 1)} sobre 100 («${banda}»).`,
      detail: 'Falta el otro lado de la brecha: esta área todavía no ha evaluado a las demás.',
    };
  }

  const magnitud = Math.abs(gap.gap);
  if (magnitud < 5) {
    return {
      tone,
      headline: `Da y recibe casi lo mismo (${formatNumber(gap.received, 1)} contra ${formatIndex(gap.granted, 1)}): sus expectativas están alineadas con las del resto.`,
      detail: `Banda «${banda}».`,
    };
  }

  // Brecha = recibido − otorgado. Positiva: recibe más de lo que reparte, es la exigente.
  return {
    tone: magnitud >= 15 ? 'warn' : tone,
    headline:
      gap.gap > 0
        ? `Es más exigente de lo que la evalúan: califica ${formatNumber(magnitud, 1)} puntos por debajo de la nota que ella recibe.`
        : `La califican peor de lo que ella califica: ${formatNumber(magnitud, 1)} puntos por debajo de lo que reparte.`,
    detail:
      gap.gap > 0
        ? 'Conviene revisar si está midiendo a las demás con una vara distinta a la que le aplican a ella.'
        : 'Suele pasar en áreas de las que todos dependen: reparten buena nota y cargan con la insatisfacción ajena.',
  };
}

/** El aspecto más flojo de esta área concreta. */
function aspectDetailInsight(data: AreaDetailPayload, bands: ThresholdBand[]): Insight {
  const entradas = Object.keys(ASPECT_LABELS)
    .map((code) => ({ code, label: ASPECT_LABELS[code], value: data.aspects?.aspects[code] ?? null }))
    .filter((entry): entry is { code: string; label: string; value: number } => entry.value !== null);

  if (entradas.length < 2) {
    return { tone: 'neutral', headline: 'Faltan aspectos con dato para compararlos.' };
  }

  const ordenados = [...entradas].sort((a, b) => a.value - b.value);
  const peor = ordenados[0];
  const mejor = ordenados[ordenados.length - 1];
  const distancia = mejor.value - peor.value;

  if (distancia < 8) {
    return {
      tone: toneOfBand(classify(peor.value, bands), bands),
      headline: `Los cinco aspectos van parejos, entre ${formatNumber(peor.value, 1)} y ${formatNumber(mejor.value, 1)}.`,
      detail: 'No hay una falla puntual: lo que se mueva tiene que moverse en bloque.',
    };
  }

  return {
    tone: toneOfBand(classify(peor.value, bands), bands),
    headline: `Donde más falla es en ${peor.label.toLowerCase()} (${formatNumber(peor.value, 1)}); donde mejor está es en ${mejor.label.toLowerCase()} (${formatNumber(mejor.value, 1)}).`,
    detail: `${formatNumber(distancia, 1)} puntos de diferencia: es una falla concreta, no una percepción general.`,
  };
}
