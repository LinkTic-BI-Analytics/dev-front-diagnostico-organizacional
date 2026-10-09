'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { getNetwork } from '@/lib/admin-client';
import type { NetworkPayload } from '@/lib/admin.types';
import { useAnalysisFilters } from '@/lib/filters-store';
import {
  demandInsight,
  frequencyInsight,
  importanceInsight,
  interactionTypesInsight,
  isolationInsight,
  valueInsight,
} from '@/lib/insights';
import { formatCount, formatNumber, formatShare } from '@/lib/score-scale';
import { shortGestionName } from '@/lib/use-catalog';
import { Icon } from '@/components/ui/icons';
import { FilterBar } from '@/components/page/FilterBar';
import {
  HowToReadButton,
  InsightTitle,
  PageBody,
  PageHeader,
  PrintButton,
  SectionHeading,
  StatGrid,
} from '@/components/page/PageHeader';
import { BarRanking } from '@/components/charts/BarRanking';
import { ChartCard, Legend } from '@/components/charts/ChartCard';
import { DataTable } from '@/components/charts/DataTable';
import { EnvelopeGate, LoadingCard } from '@/components/charts/EnvelopeGate';
import { OpposedBars } from '@/components/charts/OpposedBars';
import { OrdinalBars } from '@/components/charts/OrdinalBars';
import { PackedBubbles } from '@/components/charts/PackedBubbles';
import { QuadrantScatter } from '@/components/charts/QuadrantScatter';
import { SidePanel } from '@/components/charts/SidePanel';

type DemandRow = NetworkPayload['demand'][number];

/**
 * La red de interacción: con quién trabaja cada quien, con qué frecuencia, para qué, y lo
 * que las demás áreas dicen de cada una.
 *
 * El componente 1 se pregunta para construir el mapa, pero dice algo por sí mismo: qué
 * áreas sostienen el trabajo de las demás. Cruzado con el relacionamiento que reciben,
 * señala dónde una mala relación le cuesta a más gente.
 */
export default function InteraccionPage() {
  const router = useRouter();
  const { apiFilters } = useAnalysisFilters();
  const query = useQuery({ queryKey: ['network', apiFilters], queryFn: () => getNetwork(apiFilters) });
  const [selected, setSelected] = useState<DemandRow | null>(null);
  const data = query.data?.data ?? null;
  const titular = data ? importanceInsight(data) : null;

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: 'Diagnóstico', href: '/admin' }, { label: 'Red de interacción' }]}
        kicker="Red de interacción"
        title={titular ? <InsightTitle insight={titular} /> : 'Con quién trabaja cada área, y cuánto le cuesta'}
        lede={titular?.detail ?? 'Qué áreas sostienen el trabajo de las demás, con qué frecuencia se interactúa y para qué.'}
        actions={
          <>
            <HowToReadButton title="De dónde sale la red">
              <p>
                Cada persona marca hasta cinco áreas con las que interactúa con frecuencia (1.1), la
                principal entre ellas (1.2), la frecuencia (1.3) y el tipo de interacción (1.4).
              </p>
              <p>
                La demanda de un área es cuántas personas la nombran. Lo de «más valor» y «a
                fortalecer» sale del componente 10, donde cada quien elige una sola área.
              </p>
            </HowToReadButton>
            <PrintButton />
          </>
        }
        stats={
          data && (
            <StatGrid
              items={[
                { label: 'Personas que declararon su red', value: formatCount(data.respondents) },
                {
                  label: 'Áreas nombradas como interlocutoras',
                  value: String(data.demand.filter((row) => row.mentions > 0).length),
                  unit: `de ${data.demand.length}`,
                },
                {
                  label: 'Interacción diaria o semanal',
                  value: formatShare(
                    data.frequency
                      .filter((row) => ['DIARIA', 'VARIAS_SEMANA', 'SEMANAL'].includes(row.value))
                      .reduce((sum, row) => sum + row.share, 0),
                    0,
                  ),
                },
                {
                  label: 'Sin iniciativas conjuntas',
                  value: formatShare(data.innovation.noneShare, 0),
                  hint: 'En los últimos seis meses',
                },
              ]}
            />
          )
        }
      />

      <PageBody>
        <FilterBar />
        <EnvelopeGate query={query} loading={<LoadingCard height={480} />}>
          {(red) => {
            const conMenciones = red.demand.filter((row) => row.mentions > 0);
            return (
              <>
                <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr] xl:items-start">
                  <ChartCard
                    accent
                    insight={demandInsight(red)}
                    subtitle="Cada burbuja es un área; su tamaño, cuántas personas la nombran como interlocutora frecuente. Toque una para ver el detalle."
                    legend={<Legend items={[{ label: 'Personas que la nombran', color: 'var(--series-1)', shape: 'dot' }]} />}
                    views={[
                      {
                        id: 'burbujas',
                        label: 'Burbujas',
                        content: (
                          <PackedBubbles
                            bubbles={conMenciones.map((row) => ({
                              key: row.areaCode,
                              label: row.areaName,
                              value: row.mentions,
                              color: 'var(--series-1)',
                              detail: `${formatShare(row.mentionShare, 0)} de quienes respondieron · ${row.principal} como relación principal`,
                            }))}
                            height={400}
                            ariaLabel="Demanda de cada área"
                            unit={{ one: 'persona la nombra', other: 'personas la nombran' }}
                            onSelect={(bubble) => setSelected(red.demand.find((row) => row.areaCode === bubble.key) ?? null)}
                            selectedKey={selected?.areaCode ?? null}
                            emptyMessage="Todavía nadie ha declarado con qué áreas interactúa."
                          />
                        ),
                      },
                      {
                        id: 'tabla',
                        label: 'Tabla',
                        content: (
                          <DataTable
                            caption="Demanda por área"
                            rowKey={(row) => row.areaCode}
                            rows={red.demand}
                            columns={[
                              { key: 'area', header: 'Área', render: (row) => row.areaName },
                              { key: 'gestion', header: 'Gestión', align: 'left', render: (row) => (row.procesoName ? shortGestionName(row.procesoName) : '—') },
                              { key: 'menciones', header: 'La nombran', render: (row) => row.mentions },
                              { key: 'pct', header: '%', render: (row) => formatShare(row.mentionShare, 0) },
                              { key: 'principal', header: 'Relación principal', render: (row) => row.principal },
                            ]}
                          />
                        ),
                      },
                    ]}
                  />

                  <ChartCard
                    title="Relación principal"
                    subtitle="El área que cada persona marcó como aquella con la que más se relaciona"
                  >
                    <BarRanking
                      labelWidth="11rem"
                      rows={[...red.demand]
                        .filter((row) => row.principal > 0)
                        .sort((a, b) => b.principal - a.principal)
                        .slice(0, 10)
                        .map((row) => ({ key: row.areaCode, label: row.areaName, value: row.principal }))}
                      emptyMessage="Nadie ha marcado todavía su relación principal."
                    />
                  </ChartCard>
                </div>

                <ChartCard
                  insight={importanceInsight(red)}
                  subtitle="Cada punto es un área: cuántas personas la nombran (horizontal) contra el relacionamiento que recibe (vertical)"
                  views={[
                    {
                      id: 'plano',
                      label: 'Plano',
                      content: (
                        <QuadrantScatter
                          scales={{ x: 'count', y: 'index' }}
                          points={red.importance.map((row) => ({
                            key: row.areaCode,
                            label: row.areaName,
                            x: row.mentions,
                            y: row.irel,
                            emphasis: row.mentions * (100 - row.irel),
                          }))}
                          xLabel="Personas que la nombran"
                          yLabel="Relacionamiento recibido"
                          formatX={(value) => formatNumber(value, 0)}
                          formatY={(value) => formatNumber(value, 1)}
                          quadrants={{
                            topLeft: 'Poco demandada, bien valorada',
                            topRight: 'Demandada y bien valorada',
                            bottomLeft: 'Poco demandada, por mejorar',
                            bottomRight: 'Crítica: demandada y por mejorar',
                          }}
                          emptyMessage="Faltan áreas con relacionamiento publicable para dibujar el plano."
                          onSelect={(point) => router.push(`/admin/areas/${point.key}`)}
                        />
                      ),
                    },
                    {
                      id: 'tabla',
                      label: 'Tabla',
                      content: (
                        <DataTable
                          caption="Demanda y relacionamiento por área"
                          rowKey={(row) => row.areaCode}
                          rows={[...red.importance].sort((a, b) => b.mentions - a.mentions)}
                          columns={[
                            { key: 'area', header: 'Área', render: (row) => row.areaName },
                            { key: 'menciones', header: 'La nombran', render: (row) => row.mentions },
                            { key: 'irel', header: 'Relacionamiento', render: (row) => formatNumber(row.irel, 1) },
                            { key: 'n', header: 'Evaluaciones', render: (row) => row.respondents },
                          ]}
                        />
                      ),
                    },
                  ]}
                  howToRead={
                    <p>
                      Abajo a la derecha están las áreas críticas: mucha gente depende de ellas y la
                      relación está por debajo de la mediana. Solo aparecen las áreas cuyo
                      relacionamiento alcanza la cohorte mínima de evaluaciones.
                    </p>
                  }
                />

                <SectionHeading kicker="Cómo se trabaja" title="Con qué frecuencia y para qué se interactúa" />
                <div className="grid gap-6 xl:grid-cols-2 xl:items-start">
                  <ChartCard insight={frequencyInsight(red.frequency)} subtitle="Frecuencia de interacción con las áreas declaradas (1.3)">
                    <OrdinalBars rows={red.frequency} emptyMessage="Sin datos de frecuencia todavía." />
                  </ChartCard>
                  <ChartCard
                    insight={interactionTypesInsight(red.interactionTypes)}
                    subtitle="Tipo de interacción predominante (1.4), en % de quienes respondieron"
                  >
                    <BarRanking
                      suffix="%"
                      max={100}
                      labelWidth="9rem"
                      rows={red.interactionTypes.map((row) => ({
                        key: row.value,
                        label: row.label,
                        value: row.share,
                        hint: `${row.count} ${row.count === 1 ? 'persona' : 'personas'}`,
                      }))}
                    />
                  </ChartCard>
                </div>

                <SectionHeading kicker="Lo que se dice de cada área" title="Valor que aporta contra relación que hay que fortalecer" />
                <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr] xl:items-start">
                  <ChartCard
                    insight={valueInsight(red.valueVsStrengthen)}
                    subtitle="Menciones de cada área como «la que más valor genera» y como «la que necesita fortalecer su relacionamiento»"
                  >
                    <OpposedBars
                      leftLabel="Necesita fortalecer"
                      rightLabel="Genera más valor"
                      format={(value) => formatNumber(value, 0)}
                      bothNote="En negrita, las áreas que aparecen con fuerza en los dos lados."
                      bothThreshold={2}
                      promoters={red.valueVsStrengthen.map((row) => ({
                        value: row.areaCode,
                        label: row.areaName,
                        count: row.value,
                        share: row.value,
                      }))}
                      detractors={red.valueVsStrengthen.map((row) => ({
                        value: row.areaCode,
                        label: row.areaName,
                        count: row.strengthen,
                        share: row.strengthen,
                      }))}
                      emptyMessage="Nadie ha señalado áreas de valor ni a fortalecer."
                    />
                  </ChartCard>

                  <ChartCard
                    insight={isolationInsight(red.innovation, red.demand.length)}
                    subtitle="Áreas que no aparecen en ninguna iniciativa conjunta declarada en los últimos seis meses (8.1)"
                  >
                    {red.innovation.isolated.length === 0 ? (
                      <p className="text-sm text-foreground-muted">Todas las áreas aparecen en alguna iniciativa conjunta.</p>
                    ) : (
                      <ul className="flex flex-wrap gap-2">
                        {red.innovation.isolated.map((area) => (
                          <li key={area.areaCode}>
                            <Link
                              href={`/admin/areas/${area.areaCode}`}
                              className="inline-flex min-h-8 items-center rounded-full bg-surface-muted px-3 text-[13px] text-foreground hover:bg-brand-subtle hover:text-brand"
                            >
                              {area.areaName}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </ChartCard>
                </div>
              </>
            );
          }}
        </EnvelopeGate>
      </PageBody>

      <SidePanel
        open={selected !== null}
        onClose={() => setSelected(null)}
        kicker={selected?.procesoName ? shortGestionName(selected.procesoName) : 'Área'}
        title={selected?.areaName ?? ''}
      >
        {selected && (
          <div className="flex flex-col gap-5">
            <dl className="grid grid-cols-2 gap-3">
              {(
                [
                  ['La nombran', formatCount(selected.mentions)],
                  ['De quienes respondieron', formatShare(selected.mentionShare, 0)],
                  ['Relación principal de', formatCount(selected.principal)],
                ] as [string, string][]
              ).map(([label, value]) => (
                <div key={label} className="rounded-xl bg-surface-muted px-4 py-3">
                  <dd className="text-2xl font-semibold tracking-tight text-foreground">{value}</dd>
                  <dt className="text-xs text-foreground-muted">{label}</dt>
                </div>
              ))}
            </dl>
            <p className="text-[13px] leading-relaxed text-foreground-muted">
              Cuanta más gente trabaja con un área, más pesa su relación en el día a día de la
              empresa. La ficha muestra cómo la califican.
            </p>
            <Link
              href={`/admin/areas/${selected.areaCode}`}
              className="lk-button inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold"
            >
              Abrir la ficha del área
              <Icon name="arrowRight" size={16} />
            </Link>
          </div>
        )}
      </SidePanel>
    </>
  );
}
