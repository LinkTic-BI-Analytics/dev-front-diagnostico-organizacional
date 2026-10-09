'use client';

import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { getRelationshipMap } from '@/lib/admin-client';
import { ASPECT_LABELS } from '@/lib/admin.types';
import { aspectsInsight, gapInsight, rankingInsight } from '@/lib/insights';
import { useAnalysisFilters } from '@/lib/filters-store';
import { formatIndex, formatSigned } from '@/lib/score-scale';
import { useThresholds } from '@/lib/use-thresholds';
import { FilterBar } from '@/components/page/FilterBar';
import {
  HeaderButton,
  HowToReadButton,
  InsightTitle,
  PageBody,
  PageHeader,
  PrintButton,
  SectionHeading,
  StatGrid,
} from '@/components/page/PageHeader';
import { BarRanking } from '@/components/charts/BarRanking';
import { ChartCard } from '@/components/charts/ChartCard';
import { DataTable } from '@/components/charts/DataTable';
import { DivergingBars } from '@/components/charts/DivergingBars';
import { EnvelopeGate, LoadingCard } from '@/components/charts/EnvelopeGate';
import { QuadrantScatter } from '@/components/charts/QuadrantScatter';
import { RelationshipMatrixView } from '@/components/charts/RelationshipMatrixView';
import { ScoreHeatmapGrid } from '@/components/charts/ScoreHeatmapGrid';
import { InfluenceSection } from './InfluenceSection';

/**
 * Cómo se evalúan las áreas entre sí: quién trabaja bien con quién, quién exige más de lo
 * que recibe, en qué aspecto falla cada una y, al final, la matriz en bruto.
 */
export default function MapaPage() {
  const router = useRouter();
  const { apiFilters } = useAnalysisFilters();
  const query = useQuery({
    queryKey: ['relationship-map', apiFilters],
    queryFn: () => getRelationshipMap(apiFilters),
  });
  const bands = useThresholds();
  const data = query.data?.data ?? null;
  const titular = data ? rankingInsight(data.ranking, data.suppressedRanking) : null;

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: 'Diagnóstico', href: '/admin' }, { label: 'Mapa de relacionamiento' }]}
        kicker="Mapa de relacionamiento"
        title={titular ? <InsightTitle insight={titular} /> : 'Cómo se evalúan las áreas entre sí'}
        lede="Cada área califica a las cinco con las que más trabaja. Aquí se lee lo que recibe cada una, lo que reparte y en qué aspecto falla."
        actions={
          <>
            <HeaderButton href="#influencias" icon="network">
              Quién mueve a quién
            </HeaderButton>
            <HowToReadButton title="Cómo se lee el mapa">
              <p>
                El relacionamiento (IREL) es el promedio de los cinco aspectos del componente 2,
                en escala 0-100. «Recibido» es lo que las demás le dan a un área; «otorgado», lo
                que ella da a las demás.
              </p>
              <p>
                Cada par de áreas se oculta si lo sostienen menos respuestas que la cohorte
                mínima: el riesgo de reidentificación está en el par, no en el total.
              </p>
            </HowToReadButton>
            <PrintButton />
          </>
        }
        stats={
          data && (
            <StatGrid
              items={[
                { label: 'Áreas publicadas en el ranking', value: String(data.ranking.length), hint: `${data.suppressedRanking} ocultas por cohorte` },
                {
                  label: 'Relaciones evaluadas visibles',
                  value: String(data.map.cells.length),
                  hint: `${data.suppressedCells} ocultas por cohorte`,
                },
                {
                  label: 'Áreas con los dos lados de la brecha',
                  value: String(data.gap.filter((row) => row.gap !== null).length),
                  hint: 'Reciben y otorgan calificación',
                },
              ]}
            />
          )
        }
      />

      <PageBody>
        <FilterBar />
        <EnvelopeGate query={query} loading={<LoadingCard height={420} />}>
          {(mapa) => {
            const conBrecha = mapa.gap.filter(
              (row): row is typeof row & { received: number; granted: number; gap: number } =>
                row.received !== null && row.granted !== null && row.gap !== null,
            );

            return (
              <>
                <ChartCard
                  accent
                  insight={gapInsight(mapa.gap)}
                  subtitle="Cada punto es un área: lo que da a las demás (horizontal) frente a lo que recibe (vertical), cortado por las medianas"
                  views={[
                    {
                      id: 'plano',
                      label: 'Plano',
                      content: (
                        <QuadrantScatter
                          points={conBrecha.map((row) => ({
                            key: row.areaCode,
                            label: row.areaName,
                            x: row.granted,
                            y: row.received,
                            emphasis: Math.abs(row.gap),
                          }))}
                          xLabel="Lo que otorga a las demás"
                          yLabel="Lo que recibe"
                          diagonalLabel="Da lo mismo que recibe"
                          quadrants={{
                            topLeft: 'Bien valorada y exigente',
                            topRight: 'Bien valorada y generosa',
                            bottomLeft: 'Mal valorada y exigente',
                            bottomRight: 'Mal valorada y generosa',
                          }}
                          onSelect={(point) => router.push(`/admin/areas/${point.key}`)}
                        />
                      ),
                    },
                    {
                      id: 'brecha',
                      label: 'Brecha',
                      content: (
                        <DivergingBars
                          negativeLabel="Da mejor nota de la que recibe"
                          positiveLabel="Exige más de lo que le exigen"
                          rows={mapa.gap.map((row) => ({
                            key: row.areaCode,
                            label: row.areaName,
                            value: row.gap,
                            hint: `${row.areaName}: recibe ${formatIndex(row.received, 1)}, otorga ${formatIndex(row.granted, 1)}`,
                          }))}
                          emptyMessage="Ningún área tiene los dos lados de la brecha todavía."
                        />
                      ),
                    },
                    {
                      id: 'tabla',
                      label: 'Tabla',
                      content: (
                        <DataTable
                          caption="Brecha de percepción por área"
                          rowKey={(row) => row.areaCode}
                          rows={[...mapa.gap].sort((a, b) => (b.gap ?? -999) - (a.gap ?? -999))}
                          columns={[
                            { key: 'area', header: 'Área', render: (row) => row.areaName },
                            { key: 'rec', header: 'Recibe', render: (row) => formatIndex(row.received, 1) },
                            { key: 'oto', header: 'Otorga', render: (row) => formatIndex(row.granted, 1) },
                            { key: 'gap', header: 'Brecha', render: (row) => formatSigned(row.gap) },
                          ]}
                        />
                      ),
                    },
                  ]}
                  howToRead={
                    <>
                      <p>
                        Las medianas no son metas: parten las áreas en dos mitades, así que cada
                        cuadrante dice «por encima o por debajo de lo típico en LinkTIC» en las dos
                        medidas a la vez. Sobre la diagonal, el área recibe lo mismo que da.
                      </p>
                      <p>
                        La brecha es recibido menos otorgado. Positiva: el área recibe mejores notas
                        de las que reparte —es la exigente—. Negativa: reparte mejores notas de las
                        que recibe. Toque un punto para abrir la ficha del área.
                      </p>
                    </>
                  }
                />

                <div className="grid gap-6">
                  <ChartCard
                    insight={rankingInsight(mapa.ranking, mapa.suppressedRanking)}
                    subtitle="Relacionamiento que cada área recibe de las demás (0-100)"
                  >
                    <BarRanking
                      max={100}
                      bands={bands}
                      href={(row) => `/admin/areas/${row.key}`}
                      rows={mapa.ranking.map((row) => ({
                        key: row.areaCode,
                        label: row.areaName,
                        value: row.irel,
                        hint: `${row.respondents} ${row.respondents === 1 ? 'respuesta' : 'respuestas'}`,
                      }))}
                      emptyMessage="Ningún área alcanza todavía la cohorte mínima para publicarse."
                    />
                  </ChartCard>

                  <ChartCard
                    insight={aspectsInsight(mapa.aspects, bands)}
                    subtitle={`Los cinco aspectos del componente 2 por área evaluada: ${Object.values(ASPECT_LABELS).join(', ').toLowerCase()}`}
                  >
                    <ScoreHeatmapGrid rows={mapa.aspects} bands={bands} />
                  </ChartCard>
                </div>

                <InfluenceSection />

                <SectionHeading kicker="El dato en bruto" title="La matriz completa, par a par" />
                <ChartCard
                  title="Quién califica a quién"
                  subtitle="Lea una fila para ver cómo evalúa un área a las demás, o una columna para ver cómo la evalúan a ella"
                >
                  <RelationshipMatrixView payload={mapa} bands={bands} />
                </ChartCard>
              </>
            );
          }}
        </EnvelopeGate>
      </PageBody>
    </>
  );
}
