'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import { exportUrl, getMonitoring, getResponses } from '@/lib/admin-client';
import type { MonitoringPayload } from '@/lib/admin.types';
import {
  coverageInsight,
  dropOffInsight,
  durationInsight,
  monitoringInsight,
  paceInsight,
  rolesInsight,
  scheduleInsight,
} from '@/lib/insights';
import {
  formatCount,
  formatDateTime,
  formatDuration,
  formatRelative,
  formatShare,
} from '@/lib/score-scale';
import { shortGestionName } from '@/lib/use-catalog';
import { Icon } from '@/components/ui/icons';
import {
  HeaderButton,
  InsightTitle,
  PageBody,
  PageHeader,
  SectionHeading,
  StatGrid,
} from '@/components/page/PageHeader';
import { BarRanking } from '@/components/charts/BarRanking';
import { ChartCard, Legend } from '@/components/charts/ChartCard';
import { DataTable } from '@/components/charts/DataTable';
import { EnvelopeGate, ErrorCard, LoadingCard } from '@/components/charts/EnvelopeGate';
import {
  ActivityHeatmap,
  DurationHistogram,
  FunnelBars,
  WEEKDAYS_LONG,
  funnelRows,
} from '@/components/charts/MonitoringCharts';
import { PackedBubbles, type Bubble } from '@/components/charts/PackedBubbles';
import { SidePanel } from '@/components/charts/SidePanel';
import { TimelineChart, formatDay } from '@/components/charts/TimelineChart';

/** Cada cuánto se vuelve a pedir el corte. Con 120 peticiones por minuto de techo en la API, sobra. */
const REFRESH_MS = 15_000;
const PAGE_SIZE = 25;

type AreaRow = MonitoringPayload['byArea'][number];

/**
 * El monitoreo de la recolección, en vivo.
 *
 * Es la vista que se deja abierta mientras la encuesta está en campo, así que contesta
 * primero lo operativo —¿llega gente?, ¿termina?, ¿dónde se cae?, ¿qué áreas faltan?— y
 * deja el listado en bruto al final. Se refresca sola cada 15 s y conserva lo pintado
 * mientras llega el corte nuevo: nada parpadea ni salta.
 *
 * No pasa por la cohorte mínima: mide participación, no opinión. La regla de anonimato
 * protege QUÉ respondió alguien, no QUE respondió, y es justo con pocas respuestas cuando
 * más se necesita mirar esto.
 */
export default function MonitoreoPage() {
  const monitoring = useQuery({
    queryKey: ['monitoring'],
    queryFn: () => getMonitoring(),
    refetchInterval: REFRESH_MS,
    refetchIntervalInBackground: false,
    placeholderData: keepPreviousData,
  });
  const now = useNow(5_000);
  const [selected, setSelected] = useState<AreaRow | null>(null);

  const payload = monitoring.data?.data ?? null;
  const meta = monitoring.data?.meta;

  if (monitoring.isLoading) {
    return (
      <>
        <PageHeader
          variant="hero"
          kicker="Recolección · en vivo"
          title="Cargando el corte de la recolección…"
        />
        <PageBody>
          <LoadingCard height={340} />
        </PageBody>
      </>
    );
  }

  if (monitoring.error || !payload || !meta) {
    return (
      <>
        <PageHeader variant="hero" kicker="Recolección · en vivo" title="Monitoreo en vivo" />
        <PageBody>
          <ErrorCard />
        </PageBody>
      </>
    );
  }

  const { totals } = payload;
  const headline = monitoringInsight(totals, now);
  const rowsFunnel = funnelRows(payload);

  return (
    <>
      <PageHeader
        variant="hero"
        breadcrumbs={[{ label: 'Diagnóstico', href: '/admin' }, { label: 'Monitoreo en vivo' }]}
        kicker="Recolección · en vivo"
        title={<InsightTitle insight={headline} />}
        lede={headline.detail}
        actions={
          <>
            <LiveStatus
              updatedAt={meta.generatedAt}
              now={now}
              fetching={monitoring.isFetching}
              onRefresh={() => void monitoring.refetch()}
            />
            <HeaderButton icon="download" href={exportUrl('xlsx')} onDark>
              Excel
            </HeaderButton>
            <HeaderButton icon="download" href={exportUrl('csv')} onDark>
              CSV
            </HeaderButton>
          </>
        }
        stats={
          <StatGrid
            onDark
            items={[
              {
                label: 'Encuestas completas',
                value: formatCount(totals.completed),
                hint:
                  totals.population !== null
                    ? `de ${formatCount(totals.population)} personas · ${totals.completedToday} hoy`
                    : `${totals.completedToday} hoy · ${totals.drafts} sin terminar`,
              },
              {
                label: 'Respondiendo ahora',
                value: formatCount(totals.activeNow),
                hint: 'Con actividad en los últimos 30 minutos',
              },
              {
                label: 'Finalización',
                value: formatShare(totals.completionRate),
                hint: `${totals.completed} de ${totals.started} que la abrieron`,
              },
              {
                label: 'Duración mediana',
                value: formatDuration(totals.medianDurationSeconds),
                hint: 'El instrumento estima 15 min',
              },
            ]}
          />
        }
      />

      <PageBody className={clsx('transition-opacity', monitoring.isPlaceholderData && 'opacity-70')}>
        <SectionHeading kicker="Avance" title="Cómo llega y hasta dónde llega la gente" />

        <ChartCard
          accent
          insight={paceInsight(payload.timeline, totals.lastSubmittedAt, now)}
          subtitle="Encuestas completas e iniciadas, acumuladas día a día (hora de Bogotá)"
          legend={
            <Legend
              items={[
                { label: 'Completas', color: 'var(--series-1)', shape: 'line' },
                { label: 'Iniciadas', color: '#90a1b9', shape: 'line' },
              ]}
            />
          }
          views={[
            {
              id: 'acumulado',
              label: 'Acumulado',
              content: (
                <TimelineChart days={payload.timeline} mode="cumulative" population={totals.population} />
              ),
            },
            {
              id: 'diario',
              label: 'Por día',
              content: <TimelineChart days={payload.timeline} mode="daily" population={null} />,
            },
            {
              id: 'tabla',
              label: 'Tabla',
              content: (
                <DataTable
                  caption="Encuestas por día"
                  rowKey={(row) => row.date}
                  rows={[...payload.timeline].reverse()}
                  columns={[
                    { key: 'dia', header: 'Día', render: (row) => formatDay(row.date, true) },
                    { key: 'abiertas', header: 'Abiertas', render: (row) => row.started },
                    { key: 'completas', header: 'Completas', render: (row) => row.completed },
                    { key: 'acum', header: 'Completas acumuladas', render: (row) => row.cumulativeCompleted },
                  ]}
                />
              ),
            },
          ]}
          howToRead={
            <p>
              La distancia entre las dos curvas es el abandono acumulado: encuestas que alguien
              abrió y no envió. Una curva que se aplana al final quiere decir que la convocatoria
              dejó de mover gente. Si hay población registrada por área, una línea marca el total
              de personas.
            </p>
          }
        />

        <div className="grid gap-6 xl:grid-cols-[1.35fr_1fr] xl:items-start">
          <ChartCard
            insight={dropOffInsight(rowsFunnel)}
            subtitle="Cuántas encuestas llegan al menos hasta cada componente, de las que se abrieron"
            views={[
              { id: 'grafica', label: 'Gráfica', content: <FunnelBars rows={rowsFunnel} /> },
              {
                id: 'tabla',
                label: 'Tabla',
                content: (
                  <DataTable
                    caption="Encuestas que alcanzan cada paso"
                    rowKey={(row) => row.key}
                    rows={rowsFunnel}
                    minWidth={420}
                    columns={[
                      { key: 'paso', header: 'Paso', render: (row) => row.label },
                      { key: 'llegan', header: 'Llegan', render: (row) => row.value },
                      {
                        key: 'pct',
                        header: '% de abiertas',
                        render: (row) => formatShare((row.value / Math.max(rowsFunnel[0].value, 1)) * 100, 0),
                      },
                    ]}
                  />
                ),
              },
            ]}
            howToRead={
              <>
                <p>
                  Cada fila cuenta las encuestas que guardaron al menos ese componente, más las
                  enviadas. La primera fila son todas las que se abrieron; la última, las que se
                  enviaron.
                </p>
                <p>
                  El dato sale del último componente que cada borrador guardó. Si alguien volvió
                  atrás y guardó un componente anterior, cuenta donde quedó, no hasta dónde llegó.
                </p>
              </>
            }
          />

          <ChartCard
            insight={durationInsight(totals.medianDurationSeconds)}
            subtitle="Duración de las encuestas terminadas, por tramos"
            views={[
              { id: 'grafica', label: 'Gráfica', content: <DurationHistogram buckets={payload.durations} /> },
              {
                id: 'tabla',
                label: 'Tabla',
                content: (
                  <DataTable
                    caption="Encuestas terminadas por tramo de duración"
                    rowKey={(row) => row.label}
                    rows={payload.durations}
                    minWidth={300}
                    columns={[
                      { key: 'tramo', header: 'Tramo', render: (row) => row.label },
                      { key: 'n', header: 'Encuestas', render: (row) => row.count },
                    ]}
                  />
                ),
              },
            ]}
            howToRead={
              <p>
                Mide desde que la persona abrió la encuesta hasta que la envió. La línea marca los
                15 minutos que el instrumento anuncia al empezar: no es una meta, es la promesa
                que se le hizo al encuestado.
              </p>
            }
          />
        </div>

        <SectionHeading kicker="Cobertura" title="Quién ya respondió y quién falta" />

        <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr] xl:items-start">
          <AreaCoverageCard
            areas={payload.byArea}
            minCohortSize={meta.minCohortSize}
            onSelect={setSelected}
            selectedKey={selected?.areaCode ?? null}
          />

          <ChartCard
            insight={rolesInsight(payload.byRole)}
            subtitle="Encuestas completas por nivel de cargo"
            footer={
              payload.unidentified > 0 ? (
                <p className="text-[13px] text-foreground-muted">
                  {payload.unidentified}{' '}
                  {payload.unidentified === 1
                    ? 'encuesta abierta todavía no declara'
                    : 'encuestas abiertas todavía no declaran'}{' '}
                  área ni cargo: se quedaron en la bienvenida.
                </p>
              ) : undefined
            }
          >
            <BarRanking
              labelWidth="7rem"
              rows={payload.byRole.map((role) => ({
                key: role.value,
                label: role.label,
                value: role.completed,
                hint: role.drafts > 0 ? `${role.drafts} sin terminar` : undefined,
              }))}
            />
          </ChartCard>
        </div>

        <ChartCard
          insight={scheduleInsight(payload.heatmap)}
          subtitle="Encuestas enviadas por día de la semana y hora del día (hora de Bogotá)"
          views={[
            { id: 'grafica', label: 'Gráfica', content: <ActivityHeatmap cells={payload.heatmap} /> },
            {
              id: 'tabla',
              label: 'Tabla',
              content: (
                <DataTable
                  caption="Envíos por franja"
                  rowKey={(row) => `${row.weekday}-${row.hour}`}
                  rows={[...payload.heatmap].sort((a, b) => b.completed - a.completed)}
                  minWidth={320}
                  columns={[
                    {
                      key: 'franja',
                      header: 'Franja',
                      render: (row) => `${WEEKDAYS_LONG[row.weekday]}, ${row.hour}:00`,
                    },
                    { key: 'n', header: 'Envíos', render: (row) => row.completed },
                  ]}
                />
              ),
            },
          ]}
        />

        <SectionHeading kicker="Listado" title="Las respuestas recibidas, en bruto" />
        <ResponsesList />
      </PageBody>

      <SidePanel
        open={selected !== null}
        onClose={() => setSelected(null)}
        kicker={selected?.procesoName ? shortGestionName(selected.procesoName) : 'Área'}
        title={selected?.areaName ?? ''}
      >
        {selected && <AreaDetail area={selected} minCohortSize={meta.minCohortSize} />}
      </SidePanel>
    </>
  );
}

/* ---------------------------------------------------------------- cobertura por área */

const COVERAGE_STATES = {
  full: { label: 'Lista para leerse', color: 'var(--series-1)', ink: '#ffffff' },
  partial: { label: 'Con respuestas, sin la cohorte', color: 'var(--ramp-1)', ink: '#0d366b' },
  empty: { label: 'Sin respuestas', color: 'var(--surface)', ink: undefined },
} as const;

function coverageState(area: AreaRow, minCohortSize: number): keyof typeof COVERAGE_STATES {
  if (area.completed >= minCohortSize) return 'full';
  if (area.completed > 0) return 'partial';
  return 'empty';
}

/**
 * Las áreas como burbujas: tamaño por encuestas completas, color por si ya alcanzan la
 * cohorte mínima. Es una rampa de tres pasos (nada, algo, suficiente) y no tres colores
 * sueltos, porque los estados están ordenados.
 */
function AreaCoverageCard({
  areas,
  minCohortSize,
  onSelect,
  selectedKey,
}: {
  areas: AreaRow[];
  minCohortSize: number;
  onSelect: (area: AreaRow) => void;
  selectedKey: string | null;
}) {
  // «Otra área» solo aparece si alguien la eligió: sin respuestas no es un hueco por cubrir.
  const visibles = areas.filter((area) => area.areaCode !== 'OTRA' || area.completed > 0);

  const bubbles: Bubble[] = visibles.map((area) => {
    const state = COVERAGE_STATES[coverageState(area, minCohortSize)];
    return {
      key: area.areaCode,
      label: area.areaCode === 'OTRA' ? 'Otra área' : area.areaName,
      value: area.completed,
      color: state.color,
      ink: state.ink,
      hollow: area.completed === 0,
      detail: `${state.label}${area.drafts > 0 ? ` · ${area.drafts} sin terminar` : ''}`,
    };
  });

  const byGestion = useMemo(() => {
    const groups = new Map<string, { label: string; completed: number; drafts: number; areas: number }>();
    for (const area of visibles) {
      const key = area.procesoCode ?? 'OTRA';
      const label = area.procesoName ? shortGestionName(area.procesoName) : 'Otra área';
      const group = groups.get(key) ?? { label, completed: 0, drafts: 0, areas: 0 };
      group.completed += area.completed;
      group.drafts += area.drafts;
      group.areas += 1;
      groups.set(key, group);
    }
    return [...groups.entries()]
      .map(([key, group]) => ({ key, ...group }))
      .sort((a, b) => b.completed - a.completed);
  }, [visibles]);

  return (
    <ChartCard
      insight={coverageInsight(areas, minCohortSize)}
      subtitle="Cada burbuja es un área; su tamaño, las encuestas completas de su gente. Toque una para ver el detalle."
      legend={
        <Legend
          items={[
            { label: COVERAGE_STATES.full.label, color: COVERAGE_STATES.full.color, shape: 'dot', hint: `${minCohortSize}+` },
            { label: COVERAGE_STATES.partial.label, color: COVERAGE_STATES.partial.color, shape: 'dot' },
            { label: COVERAGE_STATES.empty.label, color: 'var(--border-strong)', shape: 'dot' },
          ]}
        />
      }
      views={[
        {
          id: 'burbujas',
          label: 'Burbujas',
          content: (
            <PackedBubbles
              bubbles={bubbles}
              height={400}
              ariaLabel="Encuestas completas por área"
              unit={{ one: 'encuesta completa', other: 'encuestas completas' }}
              onSelect={(bubble) => {
                const area = areas.find((entry) => entry.areaCode === bubble.key);
                if (area) onSelect(area);
              }}
              selectedKey={selectedKey}
            />
          ),
        },
        {
          id: 'gestion',
          label: 'Por gestión',
          content: (
            <BarRanking
              rows={byGestion.map((group) => ({
                key: group.key,
                label: group.label,
                value: group.completed,
                hint: `${group.areas} ${group.areas === 1 ? 'área' : 'áreas'}${group.drafts > 0 ? ` · ${group.drafts} sin terminar` : ''}`,
              }))}
            />
          ),
        },
        {
          id: 'tabla',
          label: 'Tabla',
          content: (
            <DataTable
              caption="Encuestas por área"
              rowKey={(row) => row.areaCode}
              rows={[...visibles].sort((a, b) => b.completed - a.completed)}
              columns={[
                { key: 'area', header: 'Área', render: (row) => row.areaName },
                {
                  key: 'gestion',
                  header: 'Gestión',
                  align: 'left',
                  render: (row) => (row.procesoName ? shortGestionName(row.procesoName) : '—'),
                },
                { key: 'completas', header: 'Completas', render: (row) => row.completed },
                { key: 'curso', header: 'Sin terminar', render: (row) => row.drafts },
                {
                  key: 'part',
                  header: 'Participación',
                  render: (row) => (row.participationRate === null ? '—' : formatShare(row.participationRate)),
                },
              ]}
            />
          ),
        },
      ]}
      howToRead={
        <p>
          Un área se puede leer por separado —en el mapa y en su ficha— cuando tiene al menos{' '}
          {minCohortSize} encuestas completas de su propia gente: con menos, un promedio permitiría
          deducir quién dijo qué. Las burbujas en blanco son áreas de las que nadie ha respondido
          todavía.
        </p>
      }
    />
  );
}

function AreaDetail({ area, minCohortSize }: { area: AreaRow; minCohortSize: number }) {
  const faltan = Math.max(minCohortSize - area.completed, 0);
  const rows: [string, string][] = [
    ['Encuestas completas', formatCount(area.completed)],
    ['Sin terminar', formatCount(area.drafts)],
    ['Personas en el área', area.headcount === null ? 'Sin registrar' : formatCount(area.headcount)],
    ['Participación', area.participationRate === null ? '—' : formatShare(area.participationRate)],
  ];

  return (
    <div className="flex flex-col gap-5">
      <div
        className={clsx(
          'flex items-start gap-3 rounded-xl px-4 py-3 text-sm',
          faltan === 0 ? 'bg-tone-good-subtle text-tone-good' : 'bg-tone-warn-subtle text-tone-warn',
        )}
      >
        <Icon name={faltan === 0 ? 'check' : 'shield'} size={18} className="mt-0.5 shrink-0" />
        <p className="font-medium">
          {faltan === 0
            ? 'Tiene respuestas suficientes para leerse por separado sin comprometer el anonimato.'
            : `Le ${faltan === 1 ? 'falta una encuesta completa' : `faltan ${faltan} encuestas completas`} para poder leerse por separado.`}
        </p>
      </div>

      <dl className="grid grid-cols-2 gap-3">
        {rows.map(([label, value]) => (
          <div key={label} className="rounded-xl bg-surface-muted px-4 py-3">
            <dd className="text-2xl font-semibold tracking-tight text-foreground">{value}</dd>
            <dt className="text-xs text-foreground-muted">{label}</dt>
          </div>
        ))}
      </dl>

      {area.headcount === null && (
        <p className="text-[13px] leading-relaxed text-foreground-muted">
          Sin la cantidad de personas del área no se puede saber qué porción habló. Se registra
          en el catálogo de áreas (`headcount`).
        </p>
      )}

      {area.areaCode !== 'OTRA' && (
        <Link
          href={`/admin/areas/${area.areaCode}`}
          className="lk-button inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold"
        >
          Abrir la ficha del área
          <Icon name="arrowRight" size={16} />
        </Link>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- estado en vivo */

/** La hora actual, refrescada cada `interval` ms: para el «hace 5 s» del estado en vivo. */
function useNow(interval: number): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), interval);
    return () => window.clearInterval(id);
  }, [interval]);
  return now;
}

function LiveStatus({
  updatedAt,
  now,
  fetching,
  onRefresh,
}: {
  updatedAt: string;
  now: number;
  fetching: boolean;
  onRefresh: () => void;
}) {
  const seconds = Math.max(0, Math.round((now - new Date(updatedAt).getTime()) / 1000));
  return (
    <div className="lk-vidrio flex min-h-11 items-center gap-3 rounded-full pr-1.5 pl-4 text-sm text-white">
      <span className="flex items-center gap-2">
        <span aria-hidden className="lk-en-vivo relative size-2 rounded-full bg-lk-green" />
        <span className="font-semibold">En vivo</span>
      </span>
      <span className="hidden text-slate-300 sm:inline" aria-live="polite">
        {fetching ? 'Actualizando…' : seconds < 5 ? 'recién actualizado' : `hace ${seconds} s`}
      </span>
      <button
        type="button"
        onClick={onRefresh}
        disabled={fetching}
        className="inline-flex min-h-8 items-center gap-1.5 rounded-full bg-white/10 px-3 text-[13px] font-medium hover:bg-white/15 disabled:opacity-60"
      >
        <Icon name="refresh" size={14} className={fetching ? 'animate-spin' : undefined} />
        Actualizar
      </button>
    </div>
  );
}

/* ---------------------------------------------------------------- listado */

function ResponsesList() {
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: ['responses', page],
    queryFn: () => getResponses(page, PAGE_SIZE),
    refetchInterval: REFRESH_MS,
    refetchIntervalInBackground: false,
    placeholderData: keepPreviousData,
  });

  return (
    <EnvelopeGate query={query}>
      {(data) => {
        const pages = Math.max(1, Math.ceil(data.total / data.pageSize));
        return (
          <ChartCard
            title={`${formatCount(data.total)} encuestas completas`}
            subtitle="La encuesta es anónima: no se guarda el nombre. El área y el cargo sirven para leer los resultados por proceso y por nivel."
            aside={
              <div className="flex gap-2">
                <a
                  href={exportUrl('xlsx')}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-border-strong px-3.5 text-[13px] font-medium text-foreground hover:border-brand hover:text-brand"
                >
                  <Icon name="download" size={15} />
                  Excel
                </a>
                <a
                  href={exportUrl('csv')}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-border-strong px-3.5 text-[13px] font-medium text-foreground hover:border-brand hover:text-brand"
                >
                  <Icon name="download" size={15} />
                  CSV
                </a>
              </div>
            }
            footer={
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-[13px] text-foreground-muted">
                  Página {data.page} de {pages}
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                    className="inline-flex min-h-9 items-center gap-1 rounded-full border border-border-strong px-3.5 text-[13px] font-medium text-foreground hover:border-brand hover:text-brand disabled:pointer-events-none disabled:opacity-40"
                  >
                    <Icon name="chevronLeft" size={15} />
                    Anterior
                  </button>
                  <button
                    type="button"
                    disabled={page >= pages}
                    onClick={() => setPage((current) => current + 1)}
                    className="inline-flex min-h-9 items-center gap-1 rounded-full border border-border-strong px-3.5 text-[13px] font-medium text-foreground hover:border-brand hover:text-brand disabled:pointer-events-none disabled:opacity-40"
                  >
                    Siguiente
                    <Icon name="chevronRight" size={15} />
                  </button>
                </div>
              </div>
            }
          >
            <div className={clsx('transition-opacity', query.isPlaceholderData && 'opacity-60')}>
              <DataTable
                caption="Encuestas completas, de la más reciente a la más antigua"
                rowKey={(row) => row.id}
                rows={data.rows}
                minWidth={680}
                columns={[
                  {
                    key: 'area',
                    header: 'Área',
                    render: (row) => (
                      <>
                        {row.ownAreaName ?? row.ownArea ?? '—'}
                        {row.ownAreaOther && (
                          <span className="ml-1.5 text-xs text-foreground-subtle">({row.ownAreaOther})</span>
                        )}
                      </>
                    ),
                  },
                  {
                    key: 'cargo',
                    header: 'Cargo',
                    align: 'left',
                    render: (row) => row.respondentRoleLabel ?? row.respondentRole ?? '—',
                  },
                  {
                    key: 'enviada',
                    header: 'Enviada',
                    align: 'left',
                    render: (row) => (
                      <span title={formatDateTime(row.submittedAt)}>
                        {formatRelative(row.submittedAt)}
                      </span>
                    ),
                  },
                  { key: 'duracion', header: 'Duración', render: (row) => formatDuration(row.durationSeconds) },
                  { key: 'respuestas', header: 'Respuestas', render: (row) => row.answerCount },
                ]}
              />
            </div>
          </ChartCard>
        );
      }}
    </EnvelopeGate>
  );
}
