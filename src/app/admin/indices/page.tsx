'use client';

import { useQuery } from '@tanstack/react-query';
import { getIndicators, getNps } from '@/lib/admin-client';
import { compositeInsight, npsInsight, priorities, radarInsight, toneOfBand } from '@/lib/insights';
import { useAnalysisFilters } from '@/lib/filters-store';
import { formatDateTime, formatIndex, formatNps, formatNumber } from '@/lib/score-scale';
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
import { DivergingBars } from '@/components/charts/DivergingBars';
import { EnvelopeGate, LoadingCard } from '@/components/charts/EnvelopeGate';
import { IndicatorMeters } from '@/components/charts/IndicatorMeter';
import { NpsGauge } from '@/components/charts/NpsGauge';
import { PriorityCards } from '@/components/charts/PriorityList';
import { RadarIndices } from '@/components/charts/RadarIndices';

/**
 * Los índices, con su construcción a la vista.
 *
 * El resumen dice qué pasa; esta pantalla dice de dónde sale. Es la que se abre cuando
 * alguien pregunta «¿y ese 57 cómo se calculó?», así que muestra los pesos del compuesto,
 * cuánto le resta cada índice y el NPS desagregado por área.
 */
export default function IndicesPage() {
  const { apiFilters } = useAnalysisFilters();
  const query = useQuery({ queryKey: ['indicators', apiFilters], queryFn: () => getIndicators(apiFilters) });
  const nps = useQuery({ queryKey: ['nps', apiFilters], queryFn: () => getNps(apiFilters) });
  const data = query.data?.data ?? null;
  const titular = data ? compositeInsight(data.radar, data.weights) : null;

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: 'Diagnóstico', href: '/admin' }, { label: 'Índices' }]}
        kicker="Índices del instrumento"
        title={titular ? <InsightTitle insight={titular} /> : 'Los ocho índices y el compuesto'}
        lede={
          titular?.detail ??
          'Los ocho índices del instrumento, cómo se combinan en el índice compuesto y cómo se reparte la experiencia entre áreas.'
        }
        actions={
          <>
            <HowToReadButton title="Cómo se construyen los índices">
              <p>
                Cada índice es el promedio de sus preguntas llevado a escala 0-100. El Índice de
                Madurez Colaborativa (IMC) los combina con los pesos que fija el instrumento.
              </p>
              <p>El nivel de interacción (NIO) se mide pero no entra en el compuesto.</p>
            </HowToReadButton>
            <PrintButton />
          </>
        }
        stats={
          data && (
            <StatGrid
              items={[
                {
                  label: 'Índice de Madurez Colaborativa',
                  value: formatIndex(data.composite.value, 1),
                  unit: 'de 100',
                  tag: (() => {
                    const band = data.radar.length
                      ? data.thresholds.find(
                          (entry) =>
                            data.composite.value !== null &&
                            data.composite.value >= entry.minValue &&
                            data.composite.value <= entry.maxValue,
                        )
                      : null;
                    return band ? { label: band.label, color: band.color } : null;
                  })(),
                },
                {
                  label: 'Índices en riesgo o críticos',
                  value: String(
                    data.radar.filter((point) => {
                      const tone = toneOfBand(point.band, data.thresholds);
                      return tone === 'warn' || tone === 'bad';
                    }).length,
                  ),
                  unit: `de ${data.radar.length}`,
                },
                {
                  label: 'NPS interno',
                  value: formatNps(data.nps.value),
                  hint: `${data.nps.total} calificaciones de área`,
                },
                {
                  label: 'Respuestas en el corte',
                  value: String(data.composite.respondents),
                  hint: query.data ? `Generado el ${formatDateTime(query.data.meta.generatedAt)}` : undefined,
                },
              ]}
            />
          )
        }
      />

      <PageBody>
        <FilterBar />
        <EnvelopeGate query={query} loading={<LoadingCard height={360} />}>
          {(ind) => {
            const pesos = new Map(ind.weights.map((weight) => [weight.indicatorCode, weight.weight]));
            const ordenados = [...ind.radar].sort((a, b) => (a.value ?? 999) - (b.value ?? 999));

            return (
              <>
                <ChartCard
                  accent
                  insight={radarInsight(ind.radar, ind.thresholds)}
                  subtitle="Escala 0 a 100 sobre la pista completa; los tramos de la pista son los del semáforo"
                  views={[
                    {
                      id: 'grafica',
                      label: 'Gráfica',
                      content: (
                        <IndicatorMeters
                          anchors
                          bands={ind.thresholds}
                          rows={ordenados.map((point) => ({
                            key: point.code,
                            label: point.label,
                            value: point.value,
                            hint:
                              pesos.get(point.code) !== undefined
                                ? `${point.code} · pesa ${formatNumber((pesos.get(point.code) ?? 0) * 100, 0)} % del índice compuesto`
                                : `${point.code} · no entra en el índice compuesto`,
                          }))}
                        />
                      ),
                    },
                    {
                      id: 'tabla',
                      label: 'Tabla',
                      content: (
                        <DataTable
                          caption="Los ocho índices con su peso en el compuesto"
                          rowKey={(row) => row.code}
                          rows={ordenados}
                          minWidth={420}
                          columns={[
                            { key: 'indice', header: 'Índice', render: (row) => row.label },
                            { key: 'codigo', header: 'Código', align: 'left', render: (row) => <code className="font-mono text-xs">{row.code}</code> },
                            { key: 'valor', header: 'Valor', render: (row) => formatIndex(row.value, 1) },
                            { key: 'banda', header: 'Banda', render: (row) => row.band?.label ?? '—' },
                            {
                              key: 'peso',
                              header: 'Peso',
                              render: (row) =>
                                pesos.has(row.code) ? `${formatNumber((pesos.get(row.code) ?? 0) * 100, 0)} %` : '—',
                            },
                          ]}
                        />
                      ),
                    },
                  ]}
                />

                <div className="grid gap-6 xl:grid-cols-2 xl:items-start">
                  <ChartCard
                    title="Perfil organizacional"
                    subtitle="La silueta de los ocho índices. Escala fija 0-100 para que dos cortes distintos se puedan superponer."
                  >
                    <RadarIndices points={ind.radar} />
                  </ChartCard>

                  <ChartCard
                    insight={compositeInsight(ind.radar, ind.weights)}
                    subtitle="Cuántos puntos le resta cada índice al compuesto: peso × (100 − valor)"
                    legend={<Legend items={[{ label: 'Puntos que resta al IMC', color: 'var(--series-1)' }]} />}
                    howToRead={
                      <>
                        <p>
                          El IMC no es un promedio simple: cada índice entra con su peso. Por eso el
                          que más resta no siempre es el más bajo: uno mediocre que pesa mucho puede
                          restar más que uno flojo que pesa poco.
                        </p>
                        <p className="lk-formula">
                          IMC = Σ peso × índice ={' '}
                          {ind.weights
                            .map((weight) => {
                              const punto = ind.radar.find((point) => point.code === weight.indicatorCode);
                              return `${formatNumber(weight.weight, 2)}×${formatIndex(punto?.value ?? null, 1)}`;
                            })
                            .join(' + ')}{' '}
                          = {formatIndex(ind.composite.value, 1)}
                        </p>
                      </>
                    }
                  >
                    <BarRanking
                      labelWidth="10rem"
                      rows={ind.weights
                        .map((weight) => {
                          const punto = ind.radar.find((point) => point.code === weight.indicatorCode);
                          const resta = punto?.value != null ? weight.weight * (100 - punto.value) : null;
                          return {
                            key: weight.indicatorCode,
                            label: punto?.label ?? weight.indicatorCode,
                            value: resta,
                            display: resta === null ? '—' : `−${formatNumber(resta, 1)}`,
                            hint: `Pesa ${formatNumber(weight.weight * 100, 0)} % · vale ${formatIndex(punto?.value ?? null, 1)}`,
                          };
                        })
                        .sort((a, b) => (b.value ?? 0) - (a.value ?? 0))}
                    />
                  </ChartCard>
                </div>

                <SectionHeading kicker="Intervenir primero" title="Los tres índices más bajos, con un punto de partida" />
                <PriorityCards items={priorities(ind.radar, ind.thresholds)} />

                <SectionHeading kicker="Experiencia de servicio interno" title="El NPS, en global y área por área" />
                <EnvelopeGate query={nps}>
                  {(npsData) => (
                    <div className="grid gap-6 xl:grid-cols-[1fr_1.4fr] xl:items-start">
                      <ChartCard insight={npsInsight(npsData.global)} subtitle="NPS interno y su composición">
                        <NpsGauge nps={npsData.global} />
                      </ChartCard>
                      <ChartCard
                        title="NPS por área evaluada"
                        subtitle="Real, de −100 a +100, a los dos lados del cero"
                        views={[
                          {
                            id: 'grafica',
                            label: 'Gráfica',
                            content: (
                              <DivergingBars
                                negativeLabel="Más detractores"
                                positiveLabel="Más promotores"
                                decimals={0}
                                rows={npsData.byArea.map((row) => ({
                                  key: row.areaCode,
                                  label: row.areaName,
                                  value: row.value === null ? null : Math.round(row.value),
                                  hint: `${row.areaName}: ${row.total} calificaciones`,
                                }))}
                                emptyMessage="Ningún área alcanza la cohorte mínima para publicar su NPS."
                              />
                            ),
                          },
                          {
                            id: 'tabla',
                            label: 'Tabla',
                            content: (
                              <DataTable
                                caption="NPS por área evaluada"
                                rowKey={(row) => row.areaCode}
                                rows={npsData.byArea}
                                columns={[
                                  { key: 'area', header: 'Área', render: (row) => row.areaName },
                                  { key: 'nps', header: 'NPS', render: (row) => formatNps(row.value) },
                                  { key: 'pro', header: 'Promotores', render: (row) => row.promoters },
                                  { key: 'det', header: 'Detractores', render: (row) => row.detractors },
                                  { key: 'n', header: 'Calificaciones', render: (row) => row.total },
                                ]}
                              />
                            ),
                          },
                        ]}
                        howToRead={
                          <p>
                            Solo aparecen las áreas con al menos la cohorte mínima de personas que
                            las calificaron. Un NPS negativo dice que pesan más los detractores que
                            los promotores, no que el área trabaje mal en todo.
                          </p>
                        }
                      />
                    </div>
                  )}
                </EnvelopeGate>
              </>
            );
          }}
        </EnvelopeGate>
      </PageBody>
    </>
  );
}
