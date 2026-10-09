'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getItems } from '@/lib/admin-client';
import type { ItemStat, ThresholdBand } from '@/lib/admin.types';
import { useAnalysisFilters } from '@/lib/filters-store';
import { consensusInsight, lowItemsCount, scaleItems, weakestItemInsight } from '@/lib/insights';
import { classify, formatIndex, formatNumber, formatSigned } from '@/lib/score-scale';
import { useThresholds } from '@/lib/use-thresholds';
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
import { ChartCard, SegmentedControl } from '@/components/charts/ChartCard';
import { DataTable } from '@/components/charts/DataTable';
import { EnvelopeGate, LoadingCard } from '@/components/charts/EnvelopeGate';
import { ItemHistogram } from '@/components/charts/ItemHistogram';
import { LikertBars, bandShares, netScore } from '@/components/charts/LikertBars';
import { QuadrantScatter } from '@/components/charts/QuadrantScatter';
import { SidePanel } from '@/components/charts/SidePanel';

type ScaleItem = ItemStat & { index: number; mean: number };

/**
 * Las afirmaciones del instrumento, una por una.
 *
 * Los índices promedian cinco preguntas, y el promedio borra justo lo que orienta un plan:
 * cuál de las cinco está mal. Esta vista desarma cada índice en sus afirmaciones y muestra,
 * para cada una, cuánta gente la califica bajo, cuánta alto y qué tan de acuerdo están.
 */
export default function PreguntasPage() {
  const { apiFilters } = useAnalysisFilters();
  const query = useQuery({ queryKey: ['items', apiFilters], queryFn: () => getItems(apiFilters) });
  const bands = useThresholds();
  const [selected, setSelected] = useState<string | null>(null);

  const items = useMemo(() => scaleItems(query.data?.data?.items ?? []), [query.data]);
  const titular = query.data?.data ? weakestItemInsight(query.data.data.items, bands) : null;
  const seleccionado = items.find((item) => item.code === selected) ?? null;

  const promedio = items.length ? items.reduce((sum, item) => sum + item.mean, 0) / items.length : null;
  const consensoMedio = items.length
    ? items.reduce((sum, item) => sum + (item.consensus ?? 0), 0) / items.length
    : null;

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: 'Diagnóstico', href: '/admin' }, { label: 'Preguntas' }]}
        kicker="Las afirmaciones, una por una"
        title={titular ? <InsightTitle insight={titular} /> : 'Las afirmaciones del instrumento, una por una'}
        lede={titular?.detail ?? 'Cada índice desarmado en las afirmaciones que lo forman: cuánta gente califica bajo, cuánta alto y qué tan de acuerdo están.'}
        actions={
          <>
            <HowToReadButton title="Cómo se leen las afirmaciones">
              <p>
                Cada nota de 0 a 10 se lleva a la escala de los índices (una nota de 5 es un 50) y
                cae en la banda del semáforo que le corresponde. Las bandas bajas van a la
                izquierda del cero y las altas a la derecha.
              </p>
              <p>
                El neto es lo favorable menos lo desfavorable, de −100 a +100. El consenso mide
                qué tan parecidas son las notas: 100 es que todos dieron la misma.
              </p>
            </HowToReadButton>
            <PrintButton />
          </>
        }
        stats={
          items.length > 0 && (
            <StatGrid
              items={[
                { label: 'Afirmaciones con dato', value: String(items.length), hint: 'Escalas 0-10 de los componentes 2 a 8' },
                {
                  label: 'Promedio de las afirmaciones',
                  value: promedio === null ? '—' : formatNumber(promedio, 1),
                  unit: 'de 10',
                },
                {
                  label: 'En bandas bajas',
                  value: String(lowItemsCount(items, bands)),
                  unit: `de ${items.length}`,
                  hint: 'Promedio en «En riesgo» o «Crítico»',
                },
                {
                  label: 'Consenso medio',
                  value: consensoMedio === null ? '—' : formatNumber(consensoMedio, 0),
                  unit: 'de 100',
                  hint: '100 = todos dan la misma nota',
                },
              ]}
            />
          )
        }
      />

      <PageBody>
        <FilterBar />
        <EnvelopeGate query={query} loading={<LoadingCard height={480} />}>
          {(data) => (
            <>
              <LikertCard items={items} bands={bands} onSelect={setSelected} />

              <SectionHeading kicker="Los extremos" title="Dónde está lo peor y lo mejor del instrumento" />
              <div className="grid gap-6 xl:grid-cols-2 xl:items-start">
                <ChartCard
                  title="Las 10 afirmaciones peor calificadas"
                  subtitle="Índice 0-100 de cada afirmación, con su banda"
                >
                  <BarRanking
                    max={100}
                    bands={bands}
                    labelWidth="17rem"
                    rows={[...items]
                      .sort((a, b) => a.index - b.index)
                      .slice(0, 10)
                      .map((item) => ({ key: item.code, label: item.label, value: item.index, hint: item.componentTitle }))}
                  />
                </ChartCard>
                <ChartCard
                  title="Las 10 afirmaciones mejor calificadas"
                  subtitle="Lo que hoy sostiene la colaboración, para no desarmarlo al intervenir lo demás"
                >
                  <BarRanking
                    max={100}
                    bands={bands}
                    labelWidth="17rem"
                    rows={[...items]
                      .sort((a, b) => b.index - a.index)
                      .slice(0, 10)
                      .map((item) => ({ key: item.code, label: item.label, value: item.index, hint: item.componentTitle }))}
                  />
                </ChartCard>
              </div>

              <SectionHeading kicker="Acuerdo" title="Qué tan de acuerdo está la gente en cada afirmación" />
              <ChartCard
                insight={consensusInsight(data.items)}
                subtitle="Cada punto es una afirmación: su nivel (horizontal) contra el consenso de las notas (vertical)"
                views={[
                  {
                    id: 'plano',
                    label: 'Plano',
                    content: (
                      <QuadrantScatter
                        scales={{ x: 'index', y: 'index' }}
                        points={items
                          .filter((item) => item.consensus !== null)
                          .map((item) => ({
                            key: item.code,
                            label: item.label,
                            x: item.index,
                            y: item.consensus ?? 0,
                            // Se rotulan primero las más bajas y las más divididas: son las que piden acción.
                            emphasis: 100 - item.index + (100 - (item.consensus ?? 100)) * 0.6,
                          }))}
                        xLabel="Nivel de la afirmación (0-100)"
                        yLabel="Consenso"
                        formatX={(value) => formatNumber(value, 1)}
                        formatY={(value) => formatNumber(value, 0)}
                        quadrants={{
                          topLeft: 'Baja y compartida: problema de sistema',
                          topRight: 'Alta y compartida: fortaleza',
                          bottomLeft: 'Baja y dividida: problema localizado',
                          bottomRight: 'Alta pero dividida',
                        }}
                        labelCount={5}
                        emptyMessage="Hacen falta al menos dos afirmaciones con dato."
                        selectHint="Clic para ver sus notas"
                        onSelect={(point) => setSelected(point.key)}
                      />
                    ),
                  },
                  {
                    id: 'tabla',
                    label: 'Tabla',
                    content: <ItemsTable items={items} bands={bands} onSelect={setSelected} />,
                  },
                ]}
                howToRead={
                  <>
                    <p>
                      El consenso es 100 × (1 − desviación / 5): 100 cuando todos dan la misma nota,
                      0 cuando la mitad da 0 y la mitad da 10. Las medianas parten las afirmaciones en
                      dos mitades; no son metas.
                    </p>
                    <p>
                      Arriba a la izquierda están los problemas que casi todos reconocen: se atacan con
                      un cambio de proceso. Abajo a la izquierda, los que solo vive una parte de la
                      empresa: conviene cruzarlos por área o por cargo con los filtros.
                    </p>
                  </>
                }
              />
            </>
          )}
        </EnvelopeGate>
      </PageBody>

      <SidePanel
        open={seleccionado !== null}
        onClose={() => setSelected(null)}
        kicker={seleccionado ? `Componente ${seleccionado.componentId} · ${seleccionado.componentTitle}` : undefined}
        title={seleccionado?.label ?? ''}
      >
        {seleccionado && <ItemDetail item={seleccionado} bands={bands} />}
      </SidePanel>
    </>
  );
}

function LikertCard({
  items,
  bands,
  onSelect,
}: {
  items: ScaleItem[];
  bands: ThresholdBand[];
  onSelect: (code: string) => void;
}) {
  const [order, setOrder] = useState<'componente' | 'neto'>('componente');
  const rows = useMemo(() => {
    const base = items.map((item) => ({
      key: item.code,
      label: item.label,
      group: order === 'componente' ? `${item.componentId}. ${item.componentTitle}` : undefined,
      distribution: item.distribution,
      index: item.index,
      net: netScore(bandShares(item.distribution, bands)),
    }));
    return order === 'neto' ? [...base].sort((a, b) => a.net - b.net) : base;
  }, [items, bands, order]);

  return (
    <ChartCard
      accent
      title="Cómo se reparten las notas de cada afirmación"
      subtitle="A la izquierda del cero, las notas que caen en las bandas bajas; a la derecha, las altas. El número es el neto. Toque una fila para ver sus notas."
      aside={
        <SegmentedControl
          label="Ordenar las afirmaciones"
          options={[
            { id: 'componente', label: 'Por componente' },
            { id: 'neto', label: 'Peor a mejor' },
          ]}
          value={order}
          onChange={(id) => setOrder(id as 'componente' | 'neto')}
        />
      }
      howToRead={
        <p>
          El largo de cada lado es la proporción de notas que cae en esas bandas; los números
          dentro de cada tramo son porcentajes. Una afirmación con mucho de los dos lados está
          dividida: el promedio diría «regular» y escondería que unos la viven bien y otros mal.
        </p>
      }
    >
      <LikertBars rows={rows} bands={bands} onSelect={onSelect} />
    </ChartCard>
  );
}

function ItemsTable({
  items,
  bands,
  onSelect,
}: {
  items: ScaleItem[];
  bands: ThresholdBand[];
  onSelect: (code: string) => void;
}) {
  return (
    <DataTable
      caption="Afirmaciones con su promedio, consenso y neto"
      rowKey={(row) => row.code}
      rows={[...items].sort((a, b) => a.index - b.index)}
      minWidth={720}
      columns={[
        {
          key: 'afirmacion',
          header: 'Afirmación',
          render: (row) => (
            <button
              type="button"
              onClick={() => onSelect(row.code)}
              className="text-left text-brand underline-offset-4 hover:underline"
            >
              {row.label}
            </button>
          ),
        },
        { key: 'comp', header: 'Componente', align: 'left', render: (row) => row.componentId },
        { key: 'prom', header: 'Promedio', render: (row) => formatNumber(row.mean, 1) },
        { key: 'banda', header: 'Banda', render: (row) => classify(row.index, bands)?.label ?? '—' },
        { key: 'consenso', header: 'Consenso', render: (row) => formatIndex(row.consensus, 0) },
        { key: 'neto', header: 'Neto', render: (row) => formatSigned(netScore(bandShares(row.distribution, bands)), 0) },
        { key: 'n', header: 'Respuestas', render: (row) => row.respondents },
      ]}
    />
  );
}

function ItemDetail({ item, bands }: { item: ScaleItem; bands: ThresholdBand[] }) {
  const band = classify(item.index, bands);
  const shares = bandShares(item.distribution, bands);
  const facts: [string, string][] = [
    ['Promedio', `${formatNumber(item.mean, 1)} de 10`],
    ['Banda', band?.label ?? '—'],
    ['Consenso', `${formatIndex(item.consensus, 0)} de 100`],
    ['Neto', formatSigned(netScore(shares), 0)],
    ['Desviación', item.sd === null ? '—' : formatNumber(item.sd, 2)],
    ['Respuestas', String(item.respondents)],
  ];

  return (
    <div className="flex flex-col gap-6">
      <ItemHistogram distribution={item.distribution} mean={item.mean} bands={bands} />
      <dl className="grid grid-cols-2 gap-3">
        {facts.map(([label, value]) => (
          <div key={label} className="rounded-xl bg-surface-muted px-4 py-3">
            <dd className="text-xl font-semibold tracking-tight text-foreground">{value}</dd>
            <dt className="text-xs text-foreground-muted">{label}</dt>
          </div>
        ))}
      </dl>
      <ul className="flex flex-col gap-2">
        {shares.map((entry) => (
          <li key={entry.band.label} className="flex items-center gap-3 text-sm">
            <span aria-hidden className="size-2.5 rounded-[3px]" style={{ backgroundColor: entry.color }} />
            <span className="flex-1 text-foreground">{entry.band.label}</span>
            <span className="tabular-nums text-foreground-muted">{formatNumber(entry.share, 0)}&#8239;%</span>
          </li>
        ))}
      </ul>
      {item.observations > item.respondents && (
        <p className="text-[13px] leading-relaxed text-foreground-muted">
          Esta afirmación se califica por cada área evaluada, así que suma {item.observations} notas de{' '}
          {item.respondents} personas.
        </p>
      )}
    </div>
  );
}
