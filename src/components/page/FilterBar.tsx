'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import { getSchema } from '@/lib/survey-client';
import { useAnalysisFilters, type FilterKey } from '@/lib/filters-store';
import { useCatalog } from '@/lib/use-catalog';
import { Icon } from '@/components/ui/icons';

const FIELD =
  'min-h-10 w-full rounded-xl border border-border-strong bg-white px-3 text-sm text-foreground transition-shadow focus-visible:border-lk-blue focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-lk-blue/15';

/**
 * La fila de filtros del análisis. Una sola, arriba de todo lo que acota, como pide la
 * regla de los tableros: todos los gráficos de la vista se recalculan sobre el mismo corte,
 * así que las cifras siempre cuadran entre sí.
 *
 * Las opciones salen del catálogo público (áreas, cargos y las opciones de 1.3 y 1.4), no
 * de una lista escrita aquí: si el instrumento cambia, el filtro cambia con él.
 */
export function FilterBar({ note }: { note?: string }) {
  const { filters, activeCount, setFilter, clear } = useAnalysisFilters();
  const { gestiones } = useCatalog();
  const [open, setOpen] = useState(false);
  const schema = useQuery({ queryKey: ['survey-schema'], queryFn: () => getSchema(), staleTime: 30 * 60_000 });

  const options = useMemo(() => {
    const questions = schema.data?.components.flatMap((component) => component.questions) ?? [];
    const of = (code: string) => questions.find((question) => question.code === code)?.options ?? [];
    return {
      roles: schema.data?.roles ?? [],
      frecuencias: of('c1_frecuencia'),
      tipos: of('c1_tipo_interaccion'),
    };
  }, [schema.data]);

  const labelOf: Record<FilterKey, (value: string) => string> = {
    ownArea: (value) =>
      gestiones.flatMap((gestion) => gestion.areas).find((area) => area.code === value)?.name ?? value,
    respondentRole: (value) => options.roles.find((role) => role.value === value)?.label ?? value,
    frecuencia: (value) => options.frecuencias.find((option) => option.value === value)?.label ?? value,
    tipoInteraccion: (value) => options.tipos.find((option) => option.value === value)?.label ?? value,
    from: (value) => `Desde ${value.split('-').reverse().join('/')}`,
    to: (value) => `Hasta ${value.split('-').reverse().join('/')}`,
  };

  const chips = (Object.entries(filters) as [FilterKey, string][]).map(([key, value]) => ({
    key,
    label: labelOf[key](value),
  }));

  return (
    <section aria-label="Filtros del análisis" className="lk-tarjeta lk-no-imprimir flex flex-col gap-3 px-4 py-3 sm:px-5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          aria-expanded={open}
          className="inline-flex min-h-10 items-center gap-2 rounded-full bg-surface-muted px-3.5 text-sm font-semibold text-foreground hover:bg-brand-subtle"
        >
          <Icon name="filter" size={16} />
          Filtrar el análisis
          {activeCount > 0 && (
            <span className="rounded-full bg-brand px-1.5 text-xs font-semibold text-white tabular-nums">
              {activeCount}
            </span>
          )}
          <Icon name="chevronDown" size={15} className={clsx('transition-transform', open && 'rotate-180')} />
        </button>

        {chips.length === 0 ? (
          <p className="text-[13px] text-foreground-muted">
            Viendo la empresa completa{note ? ` · ${note}` : ''}.
          </p>
        ) : (
          <ul className="flex flex-wrap items-center gap-2">
            {chips.map((chip) => (
              <li key={chip.key}>
                <button
                  type="button"
                  onClick={() => setFilter(chip.key, undefined)}
                  className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-brand/30 bg-brand-subtle px-3 text-[13px] font-medium text-brand hover:border-brand"
                  aria-label={`Quitar el filtro ${chip.label}`}
                >
                  {chip.label}
                  <Icon name="close" size={13} strokeWidth={2.2} />
                </button>
              </li>
            ))}
            <li>
              <button
                type="button"
                onClick={clear}
                className="min-h-8 rounded-full px-2 text-[13px] font-medium text-foreground-muted underline-offset-4 hover:text-foreground hover:underline"
              >
                Limpiar todo
              </button>
            </li>
          </ul>
        )}
      </div>

      {open && (
        <div className="grid gap-3 border-t border-border-subtle pt-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <Field label="Área de quien responde">
            <select
              value={filters.ownArea ?? ''}
              onChange={(event) => setFilter('ownArea', event.target.value || undefined)}
              className={FIELD}
            >
              <option value="">Todas</option>
              {gestiones.map((gestion) => (
                <optgroup key={gestion.code} label={gestion.shortName}>
                  {gestion.areas.map((area) => (
                    <option key={area.code} value={area.code}>
                      {area.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </Field>
          <Field label="Cargo">
            <select
              value={filters.respondentRole ?? ''}
              onChange={(event) => setFilter('respondentRole', event.target.value || undefined)}
              className={FIELD}
            >
              <option value="">Todos</option>
              {options.roles.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Frecuencia de interacción">
            <select
              value={filters.frecuencia ?? ''}
              onChange={(event) => setFilter('frecuencia', event.target.value || undefined)}
              className={FIELD}
            >
              <option value="">Todas</option>
              {options.frecuencias.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Tipo de interacción">
            <select
              value={filters.tipoInteraccion ?? ''}
              onChange={(event) => setFilter('tipoInteraccion', event.target.value || undefined)}
              className={FIELD}
            >
              <option value="">Todos</option>
              {options.tipos.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Enviadas desde">
            <input
              type="date"
              value={filters.from ?? ''}
              max={filters.to}
              onChange={(event) => setFilter('from', event.target.value || undefined)}
              className={FIELD}
            />
          </Field>
          <Field label="Enviadas hasta">
            <input
              type="date"
              value={filters.to ?? ''}
              min={filters.from}
              onChange={(event) => setFilter('to', event.target.value || undefined)}
              className={FIELD}
            />
          </Field>
          <p className="text-xs leading-relaxed text-foreground-subtle sm:col-span-2 lg:col-span-3 xl:col-span-6">
            Los filtros se aplican a todas las vistas del análisis mientras la pestaña esté
            abierta. Un corte con menos de la cohorte mínima de respuestas muestra el aviso de
            anonimato en lugar del dato.
          </p>
        </div>
      )}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-foreground-muted">{label}</span>
      {children}
    </label>
  );
}
