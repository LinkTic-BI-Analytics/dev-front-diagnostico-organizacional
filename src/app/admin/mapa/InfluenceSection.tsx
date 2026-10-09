'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';
import { useQuery } from '@tanstack/react-query';
import { getInfluence } from '@/lib/admin-client';
import type { InfluenceLevel, InfluencePayload, ThresholdBand } from '@/lib/admin.types';
import {
  ZONE_LABELS,
  influenceInsight,
  influenceLevers,
  influenceMatrixInsight,
  influenceNetworkInsight,
  influencePlaneInsight,
  influenceSymptoms,
  type InfluenceUnit,
} from '@/lib/insights';
import { useAnalysisFilters } from '@/lib/filters-store';
import { classify, formatIndex, formatNumber } from '@/lib/score-scale';
import { shortGestionName } from '@/lib/use-catalog';
import { useThresholds } from '@/lib/use-thresholds';
import { InsightTitle, SectionHeading } from '@/components/page/PageHeader';
import { ChartCard, SegmentedControl } from '@/components/charts/ChartCard';
import { DataTable } from '@/components/charts/DataTable';
import { EnvelopeGate, LoadingCard } from '@/components/charts/EnvelopeGate';
import { InfluenceList } from '@/components/charts/InfluenceList';
import { InfluenceMatrix } from '@/components/charts/InfluenceMatrix';
import { InfluenceNetwork } from '@/components/charts/InfluenceNetwork';
import { QuadrantScatter } from '@/components/charts/QuadrantScatter';
import { Icon } from '@/components/ui/icons';

type LevelKey = keyof InfluencePayload;
type Tab = 'red' | 'matriz' | 'plano';

const UNITS: Record<LevelKey, InfluenceUnit> = {
  areas: { one: 'área', many: 'áreas' },
  gestiones: { one: 'gestión', many: 'gestiones' },
};

const TABS: { id: Tab; label: string }[] = [
  { id: 'red', label: 'Red' },
  { id: 'matriz', label: 'Matriz' },
  { id: 'plano', label: 'Motricidad y dependencia' },
];

/**
 * Influencias: quién mueve a quién (KPI 32).
 *
 * El mapa de arriba dice cómo se califican las áreas; esta sección dice de quién depende
 * cada una, que es lo que ordena la intervención: mejorar a una área de la que dependen
 * muchas se siente en cadena; atender solo a las que dependen alivia sin resolver la causa.
 * Es la vista de influencias de la línea gráfica de referencia, con áreas en lugar de
 * factores.
 */
export function InfluenceSection() {
  const { apiFilters } = useAnalysisFilters();
  const query = useQuery({
    queryKey: ['influence', apiFilters],
    queryFn: () => getInfluence(apiFilters),
  });
  const bands = useThresholds();

  return (
    <EnvelopeGate query={query} loading={<LoadingCard height={560} />}>
      {(payload) => <InfluenceBody payload={payload} bands={bands} />}
    </EnvelopeGate>
  );
}

function InfluenceBody({ payload, bands }: { payload: InfluencePayload; bands: ThresholdBand[] }) {
  const router = useRouter();
  const [choice, setChoice] = useState<LevelKey | null>(null);
  const [tab, setTab] = useState<Tab>('red');

  // Por área si alguna relación entre áreas ya alcanza la cohorte; si no, por gestión, donde
  // cada par suma a más personas. La elección del analista manda sobre la automática.
  const automatic: LevelKey = payload.areas.edges.length > 0 ? 'areas' : 'gestiones';
  const key = choice ?? automatic;
  const unit = UNITS[key];

  const level: InfluenceLevel = useMemo(() => {
    if (key === 'areas') return payload.areas;
    return {
      ...payload.gestiones,
      nodes: payload.gestiones.nodes.map((node) => ({ ...node, name: shortGestionName(node.name) })),
    };
  }, [key, payload]);

  const numbers = useMemo(() => new Map(level.nodes.map((node, index) => [node.code, index + 1])), [level]);
  const names = useMemo(() => new Map(level.nodes.map((node) => [node.code, node.name])), [level]);
  const hrefOf = key === 'areas' ? (code: string) => `/admin/areas/${code}` : undefined;
  const titular = influenceInsight(level, unit, bands);

  const nodeTable = (
    <DataTable
      caption={`Motricidad y dependencia por ${unit.one}`}
      rowKey={(row) => row.code}
      rows={level.nodes}
      minWidth={760}
      columns={[
        { key: 'n', header: '#', render: (row) => numbers.get(row.code), align: 'right' },
        { key: 'name', header: key === 'areas' ? 'Área' : 'Gestión', render: (row) => row.name },
        { key: 'zone', header: 'Zona', render: (row) => ZONE_LABELS[row.zone] },
        { key: 'm', header: 'Motricidad', render: (row) => row.motricidad, align: 'right' },
        {
          key: 'd',
          header: 'Dependencia',
          render: (row) => (row.grantedBy > 0 ? row.dependencia : 'Sin medir'),
          align: 'right',
        },
        { key: 'cli', header: 'Dependen de ella', render: (row) => row.clients, align: 'right' },
        { key: 'prov', header: 'Depende de', render: (row) => (row.grantedBy > 0 ? row.providers : '—'), align: 'right' },
        {
          key: 'irel',
          header: 'Relacionamiento recibido',
          render: (row) => {
            const band = classify(row.irelReceived, bands);
            return row.irelReceived === null ? '—' : `${formatIndex(row.irelReceived, 1)}${band ? ` · ${band.label}` : ''}`;
          },
        },
      ]}
    />
  );

  const howToRead = (
    <>
      <p>
        Cuando la gente de una {unit.one} evalúa a otra es porque trabaja con ella y depende de lo que le
        entrega: la evaluada <strong>mueve</strong> a la que evalúa. La fuerza de cada relación sale de cuántas
        personas la declaran y con qué frecuencia interactúan, partida en tercios: fuerte, media y débil.
      </p>
      <p>
        La <strong>motricidad</strong> suma la fuerza de las relaciones en que otras dependen de una {unit.one};
        la <strong>dependencia</strong>, la de las relaciones en que ella depende de otras. Las medias de las dos
        cortan el plano en cuatro zonas: motrices (mueven y dependen poco), de enlace (las dos cosas: un cambio
        en ellas se propaga), dependientes (resienten lo que les llega) y autónomas.
      </p>
      <p>
        Una relación se dibuja solo si la sostienen al menos tantas personas como la cohorte mínima. La
        motricidad y la dependencia cuentan todas, también las ocultas: dicen con cuántas trabaja cada una, no
        qué nota le dio.
      </p>
    </>
  );

  return (
    <div className="flex flex-col gap-6">
      <SectionHeading
        id="influencias"
        kicker="Influencias · quién mueve a quién"
        title={<InsightTitle insight={titular} />}
        aside={
          <SegmentedControl
            label="Nivel de la red"
            options={[
              { id: 'areas', label: 'Áreas' },
              { id: 'gestiones', label: 'Gestiones' },
            ]}
            value={key}
            onChange={(id) => setChoice(id as LevelKey)}
          />
        }
      />
      {titular.detail && <p className="-mt-3 max-w-3xl text-[15px] leading-relaxed text-foreground-muted">{titular.detail}</p>}

      {choice === null && automatic === 'gestiones' && (
        <p className="flex items-start gap-2 rounded-xl border border-border-subtle bg-white px-4 py-3 text-[13.5px] leading-relaxed text-foreground-muted">
          <Icon name="info" size={16} className="mt-0.5 shrink-0 text-brand" />
          <span>
            Se muestra por gestión: entre áreas, ninguna de las {payload.areas.suppressedEdges} relaciones alcanza
            todavía la cohorte mínima. Por gestión cada par suma a más personas. Con más respuestas, la vista por área
            se llena sola.
          </span>
        </p>
      )}

      <div role="tablist" aria-label="Vistas de influencias" className="flex flex-wrap gap-1 border-b border-border-subtle">
        {TABS.map((entry) => (
          <button
            key={entry.id}
            type="button"
            role="tab"
            aria-selected={tab === entry.id}
            onClick={() => setTab(entry.id)}
            className={clsx(
              'lk-pestana min-h-11 px-3 text-sm font-medium transition-colors',
              tab === entry.id ? 'text-foreground' : 'text-foreground-muted hover:text-foreground',
            )}
          >
            {entry.label}
          </button>
        ))}
      </div>

      {tab === 'red' && (
        <ChartCard
          key={`red-${key}`}
          accent
          insight={influenceNetworkInsight(level, unit, bands)}
          subtitle={`Tres capas: las ${unit.many} que mueven, las que transmiten y las que resienten. Cada flecha va de la que entrega a la que depende`}
          views={[
            {
              id: 'grafica',
              label: 'Gráfica',
              content: <InfluenceNetwork level={level} bands={bands} numbers={numbers} unit={unit} hrefOf={hrefOf} />,
            },
            {
              id: 'tabla',
              label: 'Tabla',
              content: (
                <DataTable
                  caption="Relaciones visibles"
                  rowKey={(row) => `${row.from}-${row.to}`}
                  rows={level.edges}
                  minWidth={640}
                  columns={[
                    { key: 'from', header: 'Mueve (entrega)', render: (row) => `#${numbers.get(row.from)} ${names.get(row.from)}` },
                    { key: 'to', header: 'A (depende)', render: (row) => `#${numbers.get(row.to)} ${names.get(row.to)}` },
                    {
                      key: 's',
                      header: 'Fuerza',
                      render: (row) => (row.strength === 3 ? 'Fuerte' : row.strength === 2 ? 'Media' : 'Débil'),
                    },
                    { key: 'p', header: 'Personas', render: (row) => row.respondents, align: 'right' },
                    {
                      key: 'irel',
                      header: 'Relacionamiento',
                      render: (row) => {
                        const band = classify(row.irel, bands);
                        return row.irel === null ? '—' : `${formatIndex(row.irel, 1)}${band ? ` · ${band.label}` : ''}`;
                      },
                    },
                  ]}
                />
              ),
            },
          ]}
          howToRead={howToRead}
        />
      )}

      {tab === 'matriz' && (
        <ChartCard
          key={`matriz-${key}`}
          accent
          insight={influenceMatrixInsight(level, unit)}
          subtitle="Cada fila mueve a las columnas; en los márgenes, cuánto mueve y cuánto la mueven"
          views={[
            {
              id: 'grafica',
              label: 'Gráfica',
              content: <InfluenceMatrix level={level} bands={bands} numbers={numbers} unit={unit} />,
            },
            { id: 'tabla', label: 'Tabla', content: nodeTable },
          ]}
          howToRead={howToRead}
        />
      )}

      {tab === 'plano' && (
        <ChartCard
          key={`plano-${key}`}
          accent
          insight={influencePlaneInsight(level, unit)}
          subtitle="Cada punto es una de ellas: cuánto la mueven (horizontal) frente a cuánto mueve (vertical), cortado por las medias"
          views={[
            {
              id: 'grafica',
              label: 'Gráfica',
              content: (
                <QuadrantScatter
                  points={level.nodes.map((node) => {
                    const band = classify(node.irelReceived, bands);
                    return {
                      key: node.code,
                      label: `#${numbers.get(node.code)} ${node.name}`,
                      x: node.dependencia,
                      y: node.motricidad,
                      emphasis: node.motricidad + node.dependencia,
                      color: band?.color ?? 'var(--chart-ink)',
                      hollow: node.grantedBy === 0 || band === null,
                      detail: [
                        { value: ZONE_LABELS[node.zone], label: 'zona' },
                        {
                          value: node.irelReceived === null ? '—' : formatIndex(node.irelReceived, 1),
                          label: 'relacionamiento recibido',
                        },
                        ...(node.grantedBy === 0 ? [{ value: 'Sin medir', label: 'la dependencia' }] : []),
                      ],
                    };
                  })}
                  xLabel="Dependencia (cuánto la mueven)"
                  yLabel="Motricidad (cuánto mueve)"
                  scales={{ x: 'count', y: 'count' }}
                  cut={{ x: level.mean, y: level.mean, label: 'Media' }}
                  neutralVeils
                  formatX={(value) => formatNumber(value, Number.isInteger(value) ? 0 : 1)}
                  formatY={(value) => formatNumber(value, Number.isInteger(value) ? 0 : 1)}
                  quadrants={{
                    topLeft: 'Motrices',
                    topRight: 'De enlace',
                    bottomLeft: 'Autónomas',
                    bottomRight: 'Dependientes',
                  }}
                  labelCount={8}
                  height={460}
                  onSelect={hrefOf ? (point) => router.push(hrefOf(point.key)) : undefined}
                  emptyMessage={`Hacen falta al menos dos ${unit.many} relacionadas para dibujar el plano.`}
                />
              ),
            },
            { id: 'tabla', label: 'Tabla', content: nodeTable },
          ]}
          howToRead={
            <>
              {howToRead}
              <p>
                El color del punto es el relacionamiento que recibe, con el semáforo; hueco, cuando no hay dato
                publicable o nadie de ella evaluó a otras (su dependencia no se mide y queda pegada a la izquierda).
              </p>
            </>
          }
        />
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard
          title="Palancas: mueven a muchas"
          subtitle={`Motrices y de enlace, primero las peor calificadas. Mejorar su servicio se siente en cadena en las ${unit.many} que dependen de ellas`}
        >
          <InfluenceList
            nodes={influenceLevers(level)}
            numbers={numbers}
            bands={bands}
            score="received"
            hrefOf={hrefOf}
            emptyMessage={`Ninguna ${unit.one} queda por encima de la media de motricidad.`}
          />
        </ChartCard>
        <ChartCard
          title="Síntomas: dependen de muchas"
          subtitle="Lo que les falla viene en buena parte de otras: atacarlas de frente alivia sin resolver la causa. Se lista la nota que dan a quienes las mueven"
        >
          <InfluenceList
            nodes={influenceSymptoms(level)}
            numbers={numbers}
            bands={bands}
            score="granted"
            hrefOf={hrefOf}
            emptyMessage={`Ninguna ${unit.one} con la dependencia medida cae en la zona dependiente.`}
          />
        </ChartCard>
      </div>

      <aside className="rounded-2xl border border-[#f3d9b8] bg-tone-warn-subtle px-5 py-4 text-[13.5px] leading-relaxed text-[#6b3a0c]">
        <p className="flex items-center gap-2 font-semibold">
          <Icon name="info" size={16} />
          Lo que esta lectura todavía no dice
        </p>
        <ul className="mt-2 flex list-disc flex-col gap-1 pl-9">
          <li>Depender no es causar: que la gente de una {unit.one} trabaje con otra no prueba que esa otra explique sus resultados.</li>
          <li>La fuerza mide volumen —personas y frecuencia—, no calidad. La calidad la pone el color del relacionamiento.</li>
          <li>
            Una {unit.one} de la que nadie respondió aparece sin dependencia: no es que no dependa de nadie, es que no se
            midió.
          </li>
          {level.internalPairs > 0 && (
            <li>
              Por gestión no se cuentan las {level.internalPairs} relaciones entre áreas de una misma gestión: son
              internas, no influencia entre gestiones.
            </li>
          )}
        </ul>
      </aside>
    </div>
  );
}
