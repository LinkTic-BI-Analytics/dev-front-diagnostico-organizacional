'use client';

import { useQuery } from '@tanstack/react-query';
import { getIndicators, getMonitoring, getQuality } from '@/lib/admin-client';
import { qualityInsight } from '@/lib/insights';
import { getSchema } from '@/lib/survey-client';
import { formatDateTime, formatNumber, formatShare } from '@/lib/score-scale';
import { Icon, type IconName } from '@/components/ui/icons';
import { PageBody, PageHeader, PrintButton, SectionHeading, StatGrid } from '@/components/page/PageHeader';
import { BarRanking } from '@/components/charts/BarRanking';
import { ChartCard } from '@/components/charts/ChartCard';
import { DataTable } from '@/components/charts/DataTable';
import { EnvelopeGate } from '@/components/charts/EnvelopeGate';

/**
 * Las fórmulas del instrumento, tal como las define la especificación funcional
 * (`Contexto.md` §4.3). Son texto de referencia, no cálculo: el cálculo vive en el backend
 * y los pesos del compuesto se leen de la API, no de aquí.
 */
const FORMULAS: { code: string; name: string; formula: string }[] = [
  { code: 'IREL', name: 'Relacionamiento', formula: 'Promedio de los 5 aspectos del C2 × 10' },
  { code: 'ICOM', name: 'Comunicación', formula: 'Promedio de los 5 ítems del C3 × 10' },
  { code: 'ISI', name: 'Servicio interno', formula: 'Promedio de los 5 ítems del C4 × 10' },
  { code: 'IAG', name: 'Agilidad', formula: 'Promedio de los 3 ítems del C5 × 10' },
  { code: 'IINT', name: 'Integración', formula: 'Promedio de los 5 ítems del C6 × 10' },
  { code: 'ICOL', name: 'Colaboración', formula: 'Promedio de los 5 ítems del C7 × 10' },
  { code: 'IINN', name: 'Innovación', formula: '0,80 × (ítems del C8 × 10) + 0,20 × colaboración externa' },
  { code: 'NIO', name: 'Interacción', formula: '0,50 × frecuencia + 0,30 × amplitud + 0,20 × diversidad' },
  { code: 'NPS', name: 'NPS interno', formula: '% promotores (9-10) − % detractores (0-6), por par encuestado-área' },
];

/**
 * Cómo se levanta y se calcula cada cifra del panel, y de dónde sale el dato.
 *
 * Es el destino de los «¿Cómo leer?» y la vista que se muestra cuando alguien pregunta si
 * el número es confiable. También es donde aparecerán las fuentes nuevas cuando el panel
 * empiece a cruzar la encuesta con otros sistemas de recolección.
 */
export default function MetodologiaPage() {
  const indicators = useQuery({ queryKey: ['indicators'], queryFn: () => getIndicators() });
  const monitoring = useQuery({ queryKey: ['monitoring'], queryFn: () => getMonitoring() });
  const schema = useQuery({ queryKey: ['survey-schema'], queryFn: () => getSchema(), staleTime: 30 * 60_000 });
  const quality = useQuery({ queryKey: ['quality'], queryFn: () => getQuality() });

  const meta = indicators.data?.meta ?? monitoring.data?.meta;
  const minCohort = meta?.minCohortSize ?? 4;
  const thresholds = indicators.data?.data?.thresholds ?? [];
  const weights = indicators.data?.data?.weights ?? [];
  const radar = indicators.data?.data?.radar ?? [];
  const totals = monitoring.data?.data?.totals;
  const preguntas = schema.data?.components.reduce((sum, component) => sum + component.questions.length, 0);

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: 'Diagnóstico', href: '/admin' }, { label: 'Metodología y datos' }]}
        kicker="Método y calidad de los datos"
        title={`Ningún corte con menos de ${minCohort} respuestas se publica: así se protege el anonimato`}
        lede="Cómo se levanta cada dato, qué mide cada fórmula y de dónde sale. Es el lugar al que remiten los «¿Cómo leer?» del panel."
        actions={<PrintButton />}
        stats={
          <StatGrid
            items={[
              {
                label: 'Respuestas analizables',
                value: totals ? String(totals.completed) : '—',
                hint: totals ? `${totals.drafts} borradores sin enviar no cuentan` : undefined,
              },
              { label: 'Cohorte mínima', value: String(minCohort), hint: 'Respuestas para publicar un corte' },
              {
                label: 'Preguntas del instrumento',
                value: preguntas ? String(preguntas) : '—',
                hint: schema.data ? `En ${schema.data.components.length} componentes` : undefined,
              },
              { label: 'Bandas del semáforo', value: String(thresholds.length || '—'), hint: 'Definidas por la organización' },
            ]}
          />
        }
      />

      <PageBody>
        <SectionHeading kicker="Fuentes" title="De dónde sale cada dato" />
        <div className="grid gap-4 lg:grid-cols-2">
          <SourceCard
            icon="database"
            status={{ label: 'Conectada', tone: 'good' }}
            title="Encuesta de diagnóstico organizacional"
            body="Encuesta interna, anónima, de diez componentes. Cada respuesta se valida contra las reglas del instrumento antes de guardarse y el panel la lee por la API, nunca directo de la base."
            facts={[
              ['Campaña', schema.data ? `${schema.data.campaign.name} · ${schema.data.campaign.isOpen ? 'abierta' : 'cerrada'}` : '—'],
              ['Encuestas completas', totals ? String(totals.completed) : '—'],
              ['Última respuesta', totals ? formatDateTime(totals.lastSubmittedAt) : '—'],
            ]}
          />
          <SourceCard
            icon="link"
            status={{ label: 'Prevista', tone: 'neutral' }}
            title="Otras fuentes de recolección"
            body="El panel está pensado para centralizar más fuentes y cruzar sus variables con las de la encuesta. Las llaves comunes son el área (subproceso del organigrama) y el nivel de cargo: toda fuente que las traiga se podrá leer junto a estos índices, con la misma regla de anonimato."
            facts={[
              ['Llaves de cruce', 'Área · nivel de cargo'],
              ['Regla de publicación', `${minCohort}+ respuestas por corte`],
            ]}
          />
        </div>

        <SectionHeading kicker="Calidad del corte" title="Qué tanto se puede confiar en lo recogido" />
        <EnvelopeGate query={quality}>
          {(calidad) => (
            <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr] xl:items-start">
              <ChartCard
                accent
                insight={qualityInsight(calidad)}
                subtitle="Señales de respuestas que informan poco: hechas a la carrera o con la misma nota en todo"
                howToRead={
                  <>
                    <p>
                      «En línea recta» es una encuesta que dio exactamente la misma nota a las{' '}
                      {calidad.straightLining.minItems} o más afirmaciones de los componentes 3 a 8. «A
                      la carrera», una que se envió en menos de{' '}
                      {Math.round(calidad.speeders.thresholdSeconds / 60)} minutos, cuando el
                      instrumento estima 15.
                    </p>
                    <p>
                      No se excluyen del cálculo: son respuestas válidas de personas reales. Se
                      señalan para que quien lee sepa cuánto pesan y pueda cruzarlas con los filtros.
                    </p>
                  </>
                }
              >
                <dl className="grid gap-3 sm:grid-cols-2">
                  {(
                    [
                      ['Enviadas a la carrera', calidad.speeders.count, calidad.speeders.share, `En menos de ${Math.round(calidad.speeders.thresholdSeconds / 60)} min`],
                      ['En línea recta', calidad.straightLining.count, calidad.straightLining.share, 'La misma nota en todo'],
                      ['Con respuesta abierta', calidad.openAnswers.count, calidad.openAnswers.share, 'Escribieron qué cambiarían'],
                      ['«Otra» con detalle', calidad.otherSpecified, null, 'Opciones abiertas especificadas'],
                    ] as [string, number, number | null, string][]
                  ).map(([label, count, share, hint]) => (
                    <div key={label} className="rounded-xl bg-surface-sunken px-4 py-3 ring-1 ring-border-subtle">
                      <dd className="flex items-baseline gap-2 text-2xl font-semibold tracking-tight text-foreground">
                        {count}
                        {share !== null && <span className="text-sm font-medium text-foreground-muted">{formatShare(share, 0)}</span>}
                      </dd>
                      <dt className="text-sm text-foreground">{label}</dt>
                      <p className="text-xs text-foreground-subtle">{hint}</p>
                    </div>
                  ))}
                </dl>
              </ChartCard>

              <ChartCard
                title="Componentes respondidos con una sola nota"
                subtitle="Encuestas que dieron la misma nota a todas las afirmaciones de cada componente"
              >
                <BarRanking
                  suffix="%"
                  max={100}
                  labelWidth="12rem"
                  rows={calidad.flatComponents.map((component) => ({
                    key: String(component.componentId),
                    label: `${component.componentId}. ${component.title}`,
                    value: component.share,
                    hint: `${component.count} ${component.count === 1 ? 'encuesta' : 'encuestas'}`,
                  }))}
                  emptyMessage="Sin encuestas completas que revisar."
                />
              </ChartCard>
            </div>
          )}
        </EnvelopeGate>

        <SectionHeading kicker="Cálculo" title="Qué mide cada índice y cómo se combinan" />
        <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr] xl:items-start">
          <ChartCard
            title="Las fórmulas"
            subtitle="Cada ítem se responde de 0 a 10; un índice es el promedio de sus ítems llevado a 0-100"
            howToRead={
              <p>
                Los nulos no se imputan: quien no respondió un ítem no aporta a ese promedio. Las
                cifras se muestran enteras en tarjetas y con un decimal en tablas.
              </p>
            }
          >
            <DataTable
              caption="Fórmulas de los índices"
              rowKey={(row) => row.code}
              rows={FORMULAS}
              minWidth={520}
              columns={[
                {
                  key: 'indice',
                  header: 'Índice',
                  render: (row) => (
                    <span className="flex flex-col">
                      <span className="text-foreground">{row.name}</span>
                      <code className="font-mono text-xs text-foreground-subtle">{row.code}</code>
                    </span>
                  ),
                },
                { key: 'formula', header: 'Fórmula', align: 'left', render: (row) => row.formula },
              ]}
            />
          </ChartCard>

          <ChartCard
            title="Los pesos del índice compuesto (IMC)"
            subtitle="Editables por la organización; deben sumar 100 %"
            footer={
              <p className="text-[13px] leading-relaxed text-foreground-muted">
                El nivel de interacción (NIO) y el NPS se reportan aparte: uno mide intensidad, no
                calidad, y el otro tiene otra escala (−100 a +100).
              </p>
            }
          >
            <BarRanking
              labelWidth="9rem"
              suffix="%"
              rows={weights.map((weight) => ({
                key: weight.indicatorCode,
                label: radar.find((point) => point.code === weight.indicatorCode)?.label ?? weight.indicatorCode,
                value: weight.weight * 100,
                display: `${formatNumber(weight.weight * 100, 0)} %`,
              }))}
              emptyMessage="Los pesos se cargan con el resto de los índices."
            />
          </ChartCard>
        </div>

        <div className="grid gap-6 xl:grid-cols-2 xl:items-start">
          <ChartCard
            title="El semáforo"
            subtitle="Las bandas con las que se califica todo índice 0-100"
            footer={
              <p className="text-[13px] leading-relaxed text-foreground-muted">
                Los rangos y colores viven en la base de datos: la organización los ajusta sin
                desplegar. El color nunca va solo: cada cifra lleva escrita su banda.
              </p>
            }
          >
            <ul className="flex flex-col gap-2">
              {[...thresholds]
                .sort((a, b) => b.minValue - a.minValue)
                .map((band) => (
                  <li key={band.label} className="flex items-center gap-3 rounded-xl bg-surface-sunken px-4 py-3">
                    <span aria-hidden className="h-8 w-1.5 rounded-full" style={{ backgroundColor: band.color }} />
                    <span className="flex-1 text-sm font-semibold text-foreground">{band.label}</span>
                    <span className="text-sm tabular-nums text-foreground-muted">
                      {formatNumber(band.minValue, 0)}–{formatNumber(Math.round(band.maxValue), 0)}
                    </span>
                  </li>
                ))}
            </ul>
          </ChartCard>

          <ChartCard
            title="La regla de anonimato"
            subtitle="Lo que hace creíble el instrumento, no un detalle de interfaz"
          >
            <ul className="flex flex-col gap-3 text-sm leading-relaxed text-foreground-muted">
              {[
                `Ningún corte con menos de ${minCohort} respuestas se publica: con dos o tres personas, un promedio permite deducir quién dijo qué.`,
                'Cada par de áreas del mapa se oculta por separado: el riesgo está en el par evaluador-evaluada, no en el total.',
                'No se guarda el nombre. El área y el cargo son obligatorios porque, sin ellos, no hay cortes por proceso ni por nivel.',
                'El monitoreo de la recolección es la excepción: cuenta quién respondió, nunca qué respondió.',
              ].map((text) => (
                <li key={text} className="flex gap-3">
                  <Icon name="shield" size={18} className="mt-0.5 shrink-0 text-brand" />
                  <span>{text}</span>
                </li>
              ))}
            </ul>
          </ChartCard>
        </div>
      </PageBody>
    </>
  );
}

function SourceCard({
  icon,
  status,
  title,
  body,
  facts,
}: {
  icon: IconName;
  status: { label: string; tone: 'good' | 'neutral' };
  title: string;
  body: string;
  facts: [string, string][];
}) {
  return (
    <article className="lk-tarjeta flex flex-col gap-4 p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <span className="flex size-10 items-center justify-center rounded-xl bg-brand-subtle text-brand">
          <Icon name={icon} size={20} />
        </span>
        <span
          className={
            status.tone === 'good'
              ? 'rounded-full bg-tone-good-subtle px-2.5 py-1 text-xs font-semibold text-tone-good'
              : 'rounded-full bg-surface-muted px-2.5 py-1 text-xs font-semibold text-foreground-muted'
          }
        >
          {status.label}
        </span>
      </div>
      <h3 className="text-[17px] text-foreground">{title}</h3>
      <p className="text-sm leading-relaxed text-foreground-muted">{body}</p>
      <dl className="mt-auto grid gap-2 border-t border-border-subtle pt-4 text-[13px]">
        {facts.map(([label, value]) => (
          <div key={label} className="flex items-baseline justify-between gap-4">
            <dt className="text-foreground-subtle">{label}</dt>
            <dd className="text-right font-medium text-foreground">{value}</dd>
          </div>
        ))}
      </dl>
    </article>
  );
}
