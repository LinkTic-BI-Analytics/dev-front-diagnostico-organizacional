'use client';

import { useId, useState, type ReactNode } from 'react';
import clsx from 'clsx';
import { Icon, type IconName } from '@/components/ui/icons';
import type { Insight, Tone } from '@/lib/insights';

export interface ChartView {
  id: string;
  label: string;
  content: ReactNode;
}

interface ChartCardProps {
  /** La conclusión del bloque. Si llega, ES el título: el gráfico es su respaldo. */
  insight?: Insight;
  /** Título fijo, para bloques que muestran sin concluir (listados, formularios). */
  title?: ReactNode;
  /** Qué muestra el gráfico, en una línea. */
  subtitle?: ReactNode;
  legend?: ReactNode;
  children?: ReactNode;
  /**
   * Las vistas del bloque. Con más de una aparece el conmutador («Gráfica · Tabla»): la
   * tabla es el gemelo accesible de cada gráfico, y el lugar donde se lee el número exacto
   * sin depender del cursor.
   */
  views?: ChartView[];
  /** El método, plegado al pie. */
  howToRead?: ReactNode;
  /** Algo al margen del título: un chip, un enlace. */
  aside?: ReactNode;
  footer?: ReactNode;
  /** Filete superior con el degradado de la marca, para el bloque protagonista de la vista. */
  accent?: boolean;
  className?: string;
  id?: string;
}

/**
 * La tarjeta de cada gráfico del panel.
 *
 * El orden es el de la línea gráfica de referencia: primero la conclusión escrita, debajo
 * qué se está mirando, luego el gráfico y al pie cómo leerlo. Invertido —gráfico primero,
 * conclusión si acaso— es lo que hace que un panel se mire y no se use.
 */
export function ChartCard({
  insight,
  title,
  subtitle,
  legend,
  children,
  views,
  howToRead,
  aside,
  footer,
  accent,
  className,
  id,
}: ChartCardProps) {
  const [view, setView] = useState(views?.[0]?.id);
  const tabsId = useId();
  // Los titulares de tarjeta son rótulos: sin el punto final de la oración.
  const heading = insight ? insight.headline.replace(/\.$/, '') : title;
  const current = views?.find((entry) => entry.id === view) ?? views?.[0];

  return (
    <section
      id={id}
      className={clsx('lk-tarjeta flex scroll-mt-20 flex-col overflow-hidden', className)}
    >
      {accent && <div aria-hidden className="lk-accent-bar h-1.5" />}

      <div className="flex flex-1 flex-col gap-5 p-5 sm:p-6">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 flex-col gap-1.5">
            {heading && (
              <h2 className="text-[17px] leading-snug text-foreground sm:text-lg">
                {insight && <ToneLabel tone={insight.tone} />}
                {heading}
              </h2>
            )}
            {subtitle && (
              <p className="text-sm leading-relaxed text-foreground-subtle">{subtitle}</p>
            )}
          </div>

          {(aside || (views && views.length > 1)) && (
            <div className="lk-no-imprimir flex shrink-0 flex-wrap items-center gap-2">
              {aside}
              {views && views.length > 1 && (
                <SegmentedControl
                  id={tabsId}
                  options={views.map((entry) => ({ id: entry.id, label: entry.label }))}
                  value={current?.id}
                  onChange={setView}
                />
              )}
            </div>
          )}
        </header>

        {insight && insight.tone !== 'neutral' && <ToneChip tone={insight.tone} />}

        {legend}

        {views && views.length > 0 ? (
          <div
            role="tabpanel"
            id={`${tabsId}-panel`}
            aria-labelledby={`${tabsId}-${current?.id}`}
            key={current?.id}
            className="lk-graf-celda min-w-0"
          >
            {current?.content}
          </div>
        ) : (
          children && <div className="min-w-0">{children}</div>
        )}

        {(insight?.detail || howToRead || footer) && (
          <div className="mt-auto flex flex-col gap-3 border-t border-border-subtle pt-4">
            {insight?.detail && (
              <p className="flex items-start gap-2 text-[13px] leading-relaxed text-foreground-muted">
                <Icon
                  name="info"
                  size={15}
                  className="mt-0.5 shrink-0 text-foreground-subtle"
                />
                {insight.detail}
              </p>
            )}
            {howToRead && <HowToRead>{howToRead}</HowToRead>}
            {footer}
          </div>
        )}
      </div>
    </section>
  );
}

/** El conmutador de vistas: «Gráfica · Tabla», o las que el bloque necesite. */
export function SegmentedControl({
  id,
  options,
  value,
  onChange,
  label = 'Cambiar la vista',
}: {
  id?: string;
  options: { id: string; label: string; icon?: IconName }[];
  value: string | undefined;
  onChange: (id: string) => void;
  label?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className="inline-flex rounded-full bg-surface-muted p-1"
    >
      {options.map((option) => {
        const selected = option.id === value;
        return (
          <button
            key={option.id}
            type="button"
            role="tab"
            id={id ? `${id}-${option.id}` : undefined}
            aria-selected={selected}
            aria-controls={id ? `${id}-panel` : undefined}
            onClick={() => onChange(option.id)}
            className={clsx(
              'inline-flex min-h-9 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-medium transition-colors',
              selected
                ? 'bg-white text-foreground shadow-[0_1px_2px_#0f172a1f,0_0_0_1px_#0f172a0d]'
                : 'text-foreground-muted hover:text-foreground',
            )}
          >
            {option.icon && <Icon name={option.icon} size={15} />}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/** «¿Cómo leer?», plegado. Es el método: necesario para confiar, no para decidir. */
export function HowToRead({ children }: { children: ReactNode }) {
  return (
    <details className="group">
      <summary className="inline-flex min-h-9 cursor-pointer list-none items-center gap-1.5 rounded text-[13px] font-medium text-foreground-muted hover:text-foreground [&::-webkit-details-marker]:hidden">
        ¿Cómo leer?
        <Icon
          name="chevronDown"
          size={15}
          className="transition-transform duration-200 group-open:rotate-180"
        />
      </summary>
      <div className="mt-1 flex max-w-3xl flex-col gap-2 text-[13px] leading-relaxed text-foreground-muted">
        {children}
      </div>
    </details>
  );
}

const TONE_META: Record<Tone, { label: string; icon: IconName; className: string }> = {
  good: { label: 'Favorable', icon: 'check', className: 'bg-tone-good-subtle text-tone-good' },
  neutral: { label: 'Lectura', icon: 'info', className: 'bg-tone-neutral-subtle text-tone-neutral' },
  warn: { label: 'Atención', icon: 'alert', className: 'bg-tone-warn-subtle text-tone-warn' },
  bad: { label: 'Crítico', icon: 'alertCircle', className: 'bg-tone-bad-subtle text-tone-bad' },
};

/**
 * El tono de la lectura, con icono y palabra. Nunca solo color: las bandas del semáforo
 * no se distinguen entre sí por tono a secas, así que la palabra es la que informa.
 */
export function ToneChip({ tone }: { tone: Tone }) {
  const meta = TONE_META[tone];
  return (
    <span
      className={clsx(
        '-mt-2 inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold',
        meta.className,
      )}
    >
      <Icon name={meta.icon} size={13} strokeWidth={2.4} />
      {meta.label}
    </span>
  );
}

/** El tono para quien no ve el chip: el lector de pantalla lo oye antes del titular. */
function ToneLabel({ tone }: { tone: Tone }) {
  return <span className="sr-only">{TONE_META[tone].label}: </span>;
}

/**
 * Leyenda de un gráfico. La forma de la muestra imita a la marca (barra, línea o punto),
 * para que se reconozca sin leer.
 */
export function Legend({
  items,
}: {
  items: { label: string; color: string; shape?: 'bar' | 'line' | 'dot' | 'tick'; hint?: string }[];
}) {
  return (
    <ul className="flex flex-wrap gap-x-5 gap-y-1.5 text-[13px] text-foreground-muted">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-2">
          <LegendSwatch color={item.color} shape={item.shape ?? 'bar'} />
          <span className="text-foreground">{item.label}</span>
          {item.hint && <span className="text-foreground-subtle">{item.hint}</span>}
        </li>
      ))}
    </ul>
  );
}

function LegendSwatch({ color, shape }: { color: string; shape: 'bar' | 'line' | 'dot' | 'tick' }) {
  if (shape === 'line') {
    return <span aria-hidden className="h-0.5 w-4 rounded-full" style={{ backgroundColor: color }} />;
  }
  if (shape === 'tick') {
    return <span aria-hidden className="h-3.5 w-0.5 rounded-full" style={{ backgroundColor: color }} />;
  }
  if (shape === 'dot') {
    return <span aria-hidden className="size-2.5 rounded-full" style={{ backgroundColor: color }} />;
  }
  return <span aria-hidden className="size-2.5 rounded-[3px]" style={{ backgroundColor: color }} />;
}
