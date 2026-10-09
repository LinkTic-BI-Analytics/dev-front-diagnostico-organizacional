'use client';

import { useQuery } from '@tanstack/react-query';
import { getComponents, getIndicesByArea, getIndicesByRole } from '@/lib/admin-client';
import {
  byAreaInsight,
  hierarchyInsight,
  innovationInsight,
  radarInsight,
  rolesSpreadInsight,
} from '@/lib/insights';
import { useAnalysisFilters } from '@/lib/filters-store';
import { formatIndex, formatSigned } from '@/lib/score-scale';
import { useAreaNames } from '@/lib/use-area-names';
import { FilterBar } from '@/components/page/FilterBar';
import { InsightTitle, PageBody, PageHeader, PrintButton, SectionHeading } from '@/components/page/PageHeader';
import { DivergingBars } from '@/components/charts/DivergingBars';
import { BarRanking } from '@/components/charts/BarRanking';
import { ChartCard } from '@/components/charts/ChartCard';
import { DataTable } from '@/components/charts/DataTable';
import { EnvelopeGate, LoadingCard } from '@/components/charts/EnvelopeGate';
import { IndicatorMeters } from '@/components/charts/IndicatorMeter';
import { IndicesHeatTable } from '@/components/charts/IndicesHeatTable';

/** Los siete del IMC más NIO: el mismo conjunto que el radar. */
const INDEX_COLUMNS = ['IREL', 'ICOM', 'ISI', 'IAG', 'IINT', 'ICOL', 'IINN', 'NIO'];

const INDEX_LABELS: Record<string, string> = {
  IREL: 'Relacionamiento',
  ICOM: 'Comunicación',
  ISI: 'Servicio interno',
  IAG: 'Agilidad',
  IINT: 'Integración',
  ICOL: 'Colaboración',
  IINN: 'Innovación',
  NIO: 'Interacción',
};

/**
 * Cada componente del instrumento por separado, y cómo cambia según quién responde.
 */
export default function ComponentesPage() {
  const { apiFilters } = useAnalysisFilters();
  const query = useQuery({ queryKey: ['components', apiFilters], queryFn: () => getComponents(apiFilters) });
  const byArea = useQuery({
    queryKey: ['indices-by-area', apiFilters],
    queryFn: () => getIndicesByArea(apiFilters),
  });
  const byRole = useQuery({
    queryKey: ['indices-by-role', apiFilters],
    queryFn: () => getIndicesByRole(apiFilters),
  });
  const nombreDe = useAreaNames();

  const data = query.data?.data ?? null;
  const titular = data ? radarInsight(data.indicators, data.thresholds) : null;

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: 'Diagnóstico', href: '/admin' }, { label: 'Componentes' }]}
        kicker="Componentes del instrumento"
        title={titular ? <InsightTitle insight={titular} /> : 'Lo que mide cada componente'}
        lede="Lo que mide cada componente del instrumento por separado, y cómo cambia según el área de quien responde."
        actions={<PrintButton />}
      />

      <PageBody>
        <FilterBar />
        <EnvelopeGate query={query} loading={<LoadingCard height={360} />}>
          {(componentes) => {
            /*
             * La red de innovación llega con aristas de un área consigo misma. La pregunta 8.1
             * no lleva la regla de «no incluya su propia área» que sí tiene la 1.1, así que
             * alguien puede marcarse a sí mismo y el backend lo agrega tal cual. Un área que
             * innova consigo misma no dice nada sobre trabajo entre áreas, así que no se pinta.
             */
            const aristas = [...componentes.innovationNetwork]
              .filter((edge) => edge.sourceArea !== edge.targetArea)
              .sort((a, b) => b.initiatives - a.initiatives);
            const ordenados = [...componentes.indicators].sort((a, b) => (a.value ?? 999) - (b.value ?? 999));

            return (
              <>
                <ChartCard
                  accent
                  insight={radarInsight(componentes.indicators, componentes.thresholds)}
                  subtitle="Los indicadores ordenados por valor y no por código: lo primero que se ve es lo que hay que arreglar"
                  views={[
                    {
                      id: 'grafica',
                      label: 'Gráfica',
                      content: (
                        <IndicatorMeters
                          bands={componentes.thresholds}
                          rows={ordenados.map((indicator) => ({
                            key: indicator.code,
                            label: indicator.label,
                            value: indicator.value,
                            hint: `${indicator.code} · ${indicator.respondents} ${indicator.respondents === 1 ? 'respuesta' : 'respuestas'} · ${indicator.observations} observaciones`,
                          }))}
                        />
                      ),
                    },
                    {
                      id: 'tabla',
                      label: 'Tabla',
                      content: (
                        <DataTable
                          caption="Indicadores por componente"
                          rowKey={(row) => row.code}
                          rows={ordenados}
                          minWidth={480}
                          columns={[
                            { key: 'ind', header: 'Indicador', render: (row) => row.label },
                            { key: 'cod', header: 'Código', align: 'left', render: (row) => <code className="font-mono text-xs">{row.code}</code> },
                            { key: 'valor', header: 'Valor', render: (row) => formatIndex(row.value, 1) },
                            { key: 'banda', header: 'Banda', render: (row) => row.band?.label ?? '—' },
                            { key: 'n', header: 'Respuestas', render: (row) => row.respondents },
                          ]}
                        />
                      ),
                    },
                  ]}
                />

                <ChartCard
                  insight={innovationInsight(aristas)}
                  subtitle="Iniciativas conjuntas declaradas en los últimos seis meses, por par de áreas"
                  views={[
                    {
                      id: 'grafica',
                      label: 'Gráfica',
                      content: (
                        <BarRanking
                          labelWidth="18rem"
                          rows={aristas.slice(0, 10).map((edge) => ({
                            key: `${edge.sourceArea}-${edge.targetArea}`,
                            label: `${nombreDe(edge.sourceArea)} → ${nombreDe(edge.targetArea)}`,
                            value: edge.initiatives,
                          }))}
                          emptyMessage="Sin iniciativas conjuntas registradas."
                        />
                      ),
                    },
                    {
                      id: 'tabla',
                      label: 'Tabla',
                      content: (
                        <DataTable
                          caption="Iniciativas conjuntas por par de áreas"
                          rowKey={(row) => `${row.sourceArea}-${row.targetArea}`}
                          rows={aristas}
                          minWidth={420}
                          columns={[
                            { key: 'de', header: 'Área que declara', render: (row) => nombreDe(row.sourceArea) },
                            { key: 'con', header: 'Con', align: 'left', render: (row) => nombreDe(row.targetArea) },
                            { key: 'n', header: 'Menciones', render: (row) => row.initiatives },
                          ]}
                        />
                      ),
                    },
                  ]}
                />

                <SectionHeading kicker="Según quién responde" title="La misma organización, vista desde cada área" />
                <EnvelopeGate query={byArea}>
                  {(areaData) => (
                    <ChartCard
                      insight={byAreaInsight(areaData)}
                      subtitle="Los mismos índices según el área de quien respondió, de la más crítica a la más conforme"
                      howToRead={
                        <p>
                          Revela si el malestar está repartido o concentrado. Cada celda lleva su
                          número y un velo del color de su banda; las áreas con menos respuestas que
                          la cohorte mínima no aparecen.
                        </p>
                      }
                    >
                      {/* Sin filas, la lectura ya explica por qué: repetirlo debajo en un
                          recuadro vacío solo ocupa pantalla. */}
                      {areaData.rows.length > 0 && (
                        <IndicesHeatTable
                          payload={areaData}
                          columns={INDEX_COLUMNS}
                          labels={INDEX_LABELS}
                          bands={componentes.thresholds}
                        />
                      )}
                    </ChartCard>
                  )}
                </EnvelopeGate>

                <SectionHeading kicker="Según el nivel de cargo" title="La organización vista desde la dirección y desde los equipos" />
                <EnvelopeGate query={byRole}>
                  {(roleData) => (
                    <div className="grid gap-6">
                      <ChartCard
                        insight={hierarchyInsight(roleData)}
                        subtitle="Dirección (directores, gerentes y heads) menos equipos (profesionales y analistas), índice por índice"
                        howToRead={
                          <>
                            <p>
                              A la derecha del cero, los índices que la dirección ve mejor que los equipos;
                              a la izquierda, los que ven mejor los equipos. Los cargos se agrupan para que
                              la cohorte mínima no borre la lectura cuando un cargo suelto tiene pocas
                              respuestas.
                            </p>
                            <p>Mandos medios (coordinadores y líderes) aparecen en la matriz de al lado.</p>
                          </>
                        }
                      >
                        <DivergingBars
                          negativeLabel="Lo ven mejor los equipos"
                          positiveLabel="Lo ve mejor la dirección"
                          rows={(() => {
                            const direccion = roleData.groups.find((group) => group.key === 'DIRECCION');
                            const equipos = roleData.groups.find((group) => group.key === 'EQUIPOS');
                            if (!direccion || !equipos) return [];
                            return INDEX_COLUMNS.map((code) => {
                              const a = direccion.indicators[code];
                              const b = equipos.indicators[code];
                              return {
                                key: code,
                                label: INDEX_LABELS[code],
                                value: a === null || a === undefined || b === null || b === undefined ? null : a - b,
                                hint: `${INDEX_LABELS[code]}: dirección ${formatIndex(a ?? null, 1)} · equipos ${formatIndex(b ?? null, 1)}`,
                              };
                            });
                          })()}
                          emptyMessage="Hace falta que la dirección y los equipos alcancen la cohorte mínima."
                        />
                      </ChartCard>

                      <ChartCard
                        insight={rolesSpreadInsight(roleData)}
                        subtitle="Los mismos índices según el nivel de quien respondió"
                        views={[
                          {
                            id: 'grupos',
                            label: 'Por grupo',
                            content: (
                              <IndicesHeatTable
                                payload={{
                                  rows: roleData.groups.map((row) => ({
                                    areaCode: row.key,
                                    areaName: row.label,
                                    respondents: row.respondents,
                                    indicators: row.indicators,
                                  })),
                                  suppressed: roleData.suppressedGroups,
                                }}
                                columns={INDEX_COLUMNS}
                                labels={INDEX_LABELS}
                                bands={componentes.thresholds}
                                rowHeader="Grupo de cargo"
                                emptyMessage="Ningún grupo de cargo alcanza la cohorte mínima."
                                suppressedNoun={{ one: 'grupo oculto', other: 'grupos ocultos' }}
                              />
                            ),
                          },
                          {
                            id: 'cargos',
                            label: 'Por cargo',
                            content: (
                              <IndicesHeatTable
                                payload={{
                                  rows: roleData.roles.map((row) => ({
                                    areaCode: row.key,
                                    areaName: row.label,
                                    respondents: row.respondents,
                                    indicators: row.indicators,
                                  })),
                                  suppressed: roleData.suppressedRoles,
                                }}
                                columns={INDEX_COLUMNS}
                                labels={INDEX_LABELS}
                                bands={componentes.thresholds}
                                rowHeader="Cargo"
                                emptyMessage="Ningún cargo alcanza la cohorte mínima por sí solo."
                                suppressedNoun={{ one: 'cargo oculto', other: 'cargos ocultos' }}
                              />
                            ),
                          },
                          {
                            id: 'tabla',
                            label: 'IMC y NPS',
                            content: (
                              <DataTable
                                caption="Índice compuesto y NPS por grupo de cargo"
                                rowKey={(row) => row.key}
                                rows={roleData.groups}
                                minWidth={380}
                                columns={[
                                  { key: 'grupo', header: 'Grupo', render: (row) => row.label },
                                  { key: 'n', header: 'Respuestas', render: (row) => row.respondents },
                                  { key: 'imc', header: 'IMC', render: (row) => formatIndex(row.imc, 1) },
                                  { key: 'nps', header: 'NPS', render: (row) => (row.nps === null ? '—' : formatSigned(row.nps, 0)) },
                                ]}
                              />
                            ),
                          },
                        ]}
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
