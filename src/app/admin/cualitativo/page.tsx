'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getQualitative, updateTheme } from '@/lib/admin-client';
import type { CountedOption, OpenAnswer } from '@/lib/admin.types';
import {
  barriersInsight,
  motivesInsight,
  openAnswersInsight,
  strengthenInsight,
} from '@/lib/insights';
import { useAnalysisFilters } from '@/lib/filters-store';
import { formatDate } from '@/lib/score-scale';
import { useAreaNames } from '@/lib/use-area-names';
import { Icon } from '@/components/ui/icons';
import { FilterBar } from '@/components/page/FilterBar';
import {
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
import { EmptyState } from '@/components/charts/InsufficientData';
import { OpposedBars } from '@/components/charts/OpposedBars';
import { PackedBubbles, type Bubble } from '@/components/charts/PackedBubbles';
import { SidePanel } from '@/components/charts/SidePanel';

/** Una idea: las respuestas que dicen lo mismo, por tema asignado o por texto idéntico. */
interface IdeaGroup {
  key: string;
  label: string;
  themed: boolean;
  answers: OpenAnswer[];
}

/** Sin tildes, mayúsculas ni puntuación: «Comunicación.» y «comunicacion» son la misma idea. */
function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Agrupa las respuestas abiertas en ideas. Manda el tema que asignó un admin; sin tema, se
 * juntan solo las que dicen literalmente lo mismo (normalizadas). No se intenta adivinar
 * sinónimos: agrupar «comunicación» con «información» es una decisión de quien analiza, y
 * para eso está el tema.
 */
function groupIdeas(answers: OpenAnswer[]): IdeaGroup[] {
  const groups = new Map<string, IdeaGroup>();
  for (const answer of answers) {
    const text = answer.text.trim();
    if (!text) continue;
    const key = answer.theme ? `tema:${normalize(answer.theme)}` : `texto:${normalize(text)}`;
    const group = groups.get(key);
    if (group) group.answers.push(answer);
    else
      groups.set(key, {
        key,
        label: answer.theme ?? (text.length > 80 ? `${text.slice(0, 78)}…` : text),
        themed: Boolean(answer.theme),
        answers: [answer],
      });
  }
  return [...groups.values()].sort((a, b) => b.answers.length - a.answers.length);
}

export default function CualitativoPage() {
  const { apiFilters } = useAnalysisFilters();
  const query = useQuery({ queryKey: ['qualitative', apiFilters], queryFn: () => getQualitative(apiFilters) });
  const data = query.data?.data ?? null;
  const meta = query.data?.meta;
  const titular = data ? barriersInsight(data.barriers) : null;
  const ideas = useMemo(() => (data ? groupIdeas(data.openAnswers) : []), [data]);

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: 'Diagnóstico', href: '/admin' }, { label: 'Cualitativo' }]}
        kicker="Oportunidades de transformación"
        title={titular ? <InsightTitle insight={titular} /> : 'Lo que la gente señala como el problema'}
        lede={
          data
            ? motivesInsight(data.npsMotives).headline
            : 'Lo que la gente señala como el problema, con sus propias palabras y con las opciones que marcó.'
        }
        actions={<PrintButton />}
        stats={
          data &&
          meta && (
            <StatGrid
              items={[
                { label: 'Respuestas analizadas', value: String(meta.n) },
                {
                  label: 'Escribieron qué cambiarían',
                  value: String(data.openAnswers.length),
                  hint: meta.n > 0 ? `${Math.round((data.openAnswers.length / meta.n) * 100)} % de quienes respondieron` : undefined,
                },
                { label: 'Ideas distintas', value: String(ideas.length), hint: 'Agrupadas por tema o por texto idéntico' },
                {
                  label: 'Sin clasificar',
                  value: String(data.openAnswers.filter((answer) => !answer.theme).length),
                  hint: 'Respuestas abiertas sin tema asignado',
                },
              ]}
            />
          )
        }
      />

      <PageBody>
        <FilterBar />
        <EnvelopeGate query={query} loading={<LoadingCard height={420} />}>
          {(qual, corte) => (
            <>
              <IdeasCard answers={qual.openAnswers} ideas={ideas} total={corte.n} />

              <SectionHeading kicker="Lo que marcaron" title="Obstáculos y motivos, con las opciones del instrumento" />

              <div className="grid gap-6 xl:grid-cols-2 xl:items-start">
                <ChartCard
                  insight={barriersInsight(qual.barriers)}
                  subtitle="Qué frena el trabajo entre áreas, en % de encuestados"
                  howToRead={
                    <p>
                      Selección múltiple: los porcentajes son sobre encuestados, así que suman más
                      de 100. Lo que importa es la distancia entre el primero y el segundo, no el
                      valor absoluto.
                    </p>
                  }
                >
                  <BarRanking rows={toRows(qual.barriers)} suffix="%" max={100} />
                </ChartCard>

                <ChartCard
                  insight={motivesInsight(qual.npsMotives)}
                  subtitle="Por qué recomiendan y por qué no: los motivos del NPS, enfrentados"
                  howToRead={
                    <p>
                      Enfrentados y no en dos listas: así se ve de una vez si un mismo motivo pesa en
                      los dos lados, que es la señal más útil del componente.
                    </p>
                  }
                >
                  <OpposedBars promoters={qual.npsMotives.promoters} detractors={qual.npsMotives.detractors} />
                </ChartCard>

                <ChartCard
                  title="Procesos que generan más reprocesos"
                  subtitle="Marcado sobre la gestión completa, no sobre el subproceso"
                >
                  <BarRanking
                    rows={toRows(qual.reworkProcesses)}
                    suffix="%"
                    max={100}
                    emptyMessage="Nadie ha señalado un proceso todavía."
                  />
                </ChartCard>

                <ChartCard
                  insight={strengthenInsight(qual.areasToStrengthen)}
                  subtitle="Áreas que las demás piden fortalecer"
                >
                  <BarRanking
                    rows={toRows(qual.areasToStrengthen)}
                    suffix="%"
                    max={100}
                    emptyMessage="Nadie ha señalado un área todavía."
                  />
                </ChartCard>
              </div>
            </>
          )}
        </EnvelopeGate>
      </PageBody>
    </>
  );
}

function toRows(options: CountedOption[]) {
  return options.map((option) => ({
    key: option.value,
    label: option.label,
    value: option.share,
    hint: `${option.count} ${option.count === 1 ? 'mención' : 'menciones'}`,
  }));
}

/* ---------------------------------------------------------------- nube de ideas */

function IdeasCard({
  answers,
  ideas,
  total,
}: {
  answers: OpenAnswer[];
  ideas: IdeaGroup[];
  total: number;
}) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const selected = ideas.find((idea) => idea.key === selectedKey) ?? null;
  const nombreDe = useAreaNames();
  const themes = useMemo(
    () => [...new Set(answers.map((answer) => answer.theme).filter((theme): theme is string => Boolean(theme)))].sort(),
    [answers],
  );

  const bubbles: Bubble[] = ideas.map((idea) => ({
    key: idea.key,
    label: idea.label,
    value: idea.answers.length,
    color: idea.themed ? 'var(--series-1)' : 'var(--ramp-1)',
    ink: idea.themed ? '#ffffff' : '#0d366b',
    detail: idea.themed ? 'Tema asignado' : 'Sin clasificar',
  }));

  return (
    <>
      <ChartCard
        accent
        insight={openAnswersInsight(answers, total)}
        subtitle="«Si pudiera cambiar una sola cosa»: cada burbuja es una idea; las respuestas que dicen lo mismo se juntan y el contador indica cuántas veces se mencionó. Toque una para leerlas y clasificarlas."
        legend={
          <Legend
            items={[
              { label: 'Con tema asignado', color: 'var(--series-1)', shape: 'dot' },
              { label: 'Sin clasificar', color: 'var(--ramp-1)', shape: 'dot' },
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
                height={440}
                ariaLabel="Ideas de «si pudiera cambiar una sola cosa»"
                onSelect={(bubble) => setSelectedKey(bubble.key)}
                selectedKey={selectedKey}
                emptyMessage="Nadie ha dejado una respuesta abierta todavía."
              />
            ),
          },
          {
            id: 'ranking',
            label: 'Ranking',
            content: ideas.length ? (
              <DataTable
                caption="Ideas por número de menciones"
                rowKey={(row) => row.key}
                rows={ideas}
                minWidth={420}
                columns={[
                  {
                    key: 'idea',
                    header: 'Idea',
                    render: (row) => (
                      <button
                        type="button"
                        onClick={() => setSelectedKey(row.key)}
                        className="text-left text-brand underline-offset-4 hover:underline"
                      >
                        {row.label}
                      </button>
                    ),
                  },
                  { key: 'estado', header: 'Estado', align: 'left', render: (row) => (row.themed ? 'Con tema' : 'Sin clasificar') },
                  { key: 'n', header: 'Menciones', render: (row) => row.answers.length },
                ]}
              />
            ) : (
              <EmptyState message="Nadie ha dejado una respuesta abierta todavía." />
            ),
          },
          { id: 'lista', label: 'Respuestas', content: <OpenAnswersList answers={answers} themes={themes} /> },
        ]}
        howToRead={
          <>
            <p>
              Sin tema, solo se juntan las respuestas que dicen literalmente lo mismo (sin contar
              tildes, mayúsculas ni puntuación). Agrupar ideas parecidas es una decisión de quien
              analiza: se hace asignándoles el mismo tema, y queda auditado.
            </p>
            <p>El área de cada burbuja —no su diámetro— es proporcional a sus menciones.</p>
          </>
        }
      />

      <SidePanel
        open={selected !== null}
        onClose={() => setSelectedKey(null)}
        kicker={selected ? `${selected.answers.length} ${selected.answers.length === 1 ? 'mención' : 'menciones'}` : undefined}
        title={selected?.label ?? ''}
      >
        {selected && (
          <IdeaDetail
            key={selected.key}
            idea={selected}
            themes={themes}
            nombreDe={nombreDe}
            onDone={() => setSelectedKey(null)}
          />
        )}
      </SidePanel>
    </>
  );
}

function IdeaDetail({
  idea,
  themes,
  nombreDe,
  onDone,
}: {
  idea: IdeaGroup;
  themes: string[];
  nombreDe: (code: string | null | undefined) => string;
  onDone: () => void;
}) {
  const queryClient = useQueryClient();
  const [theme, setTheme] = useState(idea.themed ? idea.label : '');
  const mutation = useMutation({
    // Una petición por respuesta: el endpoint clasifica de a una y cada cambio queda auditado
    // por separado, que es lo que se quiere de una clasificación manual.
    mutationFn: async (value: string | null) => {
      for (const answer of idea.answers) await updateTheme(answer.id, value);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['qualitative'] });
      onDone();
    },
  });

  const listId = `temas-${idea.key}`;

  return (
    <div className="flex flex-col gap-6">
      <form
        className="flex flex-col gap-2 rounded-xl bg-surface-muted p-4"
        onSubmit={(event) => {
          event.preventDefault();
          mutation.mutate(theme.trim() || null);
        }}
      >
        <label htmlFor="tema-grupo" className="text-sm font-semibold text-foreground">
          Tema de {idea.answers.length === 1 ? 'esta respuesta' : `estas ${idea.answers.length} respuestas`}
        </label>
        <div className="flex gap-2">
          <input
            id="tema-grupo"
            list={listId}
            value={theme}
            maxLength={120}
            onChange={(event) => setTheme(event.target.value)}
            placeholder="Sin clasificar"
            className="min-h-11 min-w-0 flex-1 rounded-xl border border-border-strong bg-white px-3 text-sm text-foreground"
          />
          <datalist id={listId}>
            {themes.map((entry) => (
              <option key={entry} value={entry} />
            ))}
          </datalist>
          <button
            type="submit"
            disabled={mutation.isPending || theme.trim() === (idea.themed ? idea.label : '')}
            className="lk-button min-h-11 shrink-0 rounded-xl px-4 text-sm font-semibold"
          >
            {mutation.isPending ? 'Guardando…' : 'Asignar'}
          </button>
        </div>
        <p className="text-xs text-foreground-muted">
          Use un tema que ya exista para juntar esta idea con otras parecidas. Déjelo vacío para
          quitar la clasificación.
        </p>
        {mutation.isError && (
          <p role="alert" className="text-sm text-danger">
            No se pudo guardar el tema. Intente de nuevo.
          </p>
        )}
      </form>

      <ul className="flex flex-col gap-3">
        {idea.answers.map((answer) => (
          <li key={answer.id} className="flex flex-col gap-1.5 rounded-xl border border-border-subtle p-4">
            <p className="text-sm leading-relaxed text-foreground">«{answer.text}»</p>
            <p className="text-xs text-foreground-subtle">
              {answer.ownArea ? nombreDe(answer.ownArea) : 'Área sin declarar'}
              {answer.submittedAt && ` · ${formatDate(answer.submittedAt)}`}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** El listado completo, respuesta por respuesta, con su tema editable. */
function OpenAnswersList({ answers, themes }: { answers: OpenAnswer[]; themes: string[] }) {
  const queryClient = useQueryClient();
  const nombreDe = useAreaNames();
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const mutation = useMutation({
    mutationFn: ({ id, theme }: { id: string; theme: string | null }) => updateTheme(id, theme),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['qualitative'] }),
  });

  if (answers.length === 0) {
    return <EmptyState message="Nadie ha dejado una respuesta abierta todavía." />;
  }

  return (
    <ul className="flex flex-col gap-3">
      <datalist id="temas-existentes">
        {themes.map((entry) => (
          <option key={entry} value={entry} />
        ))}
      </datalist>
      {answers.map((answer) => {
        const draft = drafts[answer.id] ?? answer.theme ?? '';
        const dirty = draft !== (answer.theme ?? '');

        return (
          <li key={answer.id} className="flex flex-col gap-3 rounded-xl border border-border-subtle bg-surface-sunken p-4">
            <p className="text-sm leading-relaxed text-foreground">«{answer.text}»</p>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-foreground-subtle">
                {answer.ownArea ? nombreDe(answer.ownArea) : 'Área sin declarar'}
                {answer.submittedAt && ` · ${formatDate(answer.submittedAt)}`}
              </p>
              <div className="flex min-w-0 flex-1 items-center gap-2 sm:max-w-md">
                <Icon name="filter" size={15} className="shrink-0 text-foreground-subtle" />
                <input
                  type="text"
                  list="temas-existentes"
                  aria-label={`Tema de la respuesta «${answer.text.slice(0, 40)}»`}
                  value={draft}
                  maxLength={120}
                  placeholder="Sin clasificar"
                  onChange={(event) => setDrafts((previous) => ({ ...previous, [answer.id]: event.target.value }))}
                  className="min-h-9 min-w-0 flex-1 rounded-lg border border-border-strong bg-white px-3 text-[13px] text-foreground"
                />
                <button
                  type="button"
                  disabled={!dirty || mutation.isPending}
                  onClick={() => mutation.mutate({ id: answer.id, theme: draft.trim() || null })}
                  className="lk-button min-h-9 shrink-0 rounded-lg px-3 text-[13px] font-semibold"
                >
                  Guardar
                </button>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
