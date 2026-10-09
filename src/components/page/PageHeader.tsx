'use client';

import { Fragment, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import clsx from 'clsx';
import { Icon, type IconName } from '@/components/ui/icons';
import type { Insight } from '@/lib/insights';

/** El ancho del contenido del panel. Una sola medida para cabeceras, cuerpo y pie. */
export const CONTAINER = 'mx-auto w-full max-w-[1240px] px-4 sm:px-6 lg:px-8';

export interface Crumb {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  /** `hero` abre la vista con la portada navy; `plain` la abre sobre el plano claro. */
  variant?: 'hero' | 'plain';
  breadcrumbs?: Crumb[];
  kicker: string;
  title: ReactNode;
  lede?: ReactNode;
  actions?: ReactNode;
  /** Las cifras de la cabecera: van en vidrio sobre la portada y en tarjeta sobre el plano. */
  stats?: ReactNode;
  /** Lo que va debajo de las cifras, dentro de la cabecera (p. ej. un aviso). */
  footer?: ReactNode;
}

/**
 * La cabecera de cada vista.
 *
 * Abre siempre con la conclusión, no con el nombre de la vista: «La colaboración está en
 * riesgo» y no «Dashboard». El nombre ya está en el menú y en las migas; repetirlo como
 * titular gasta el lugar más visible de la pantalla en algo que el lector ya sabe.
 */
export function PageHeader({
  variant = 'plain',
  breadcrumbs,
  kicker,
  title,
  lede,
  actions,
  stats,
  footer,
}: PageHeaderProps) {
  const hero = variant === 'hero';

  return (
    <header
      className={clsx(
        hero && 'lk-portada lk-sobre-oscuro relative isolate overflow-hidden',
      )}
    >
      {hero && <div aria-hidden className="lk-reticula" />}

      <div
        className={clsx(
          CONTAINER,
          'relative flex flex-col',
          hero ? 'gap-5 pt-7 pb-10 sm:pt-9 lg:pb-12' : 'gap-4 pt-7 pb-2 sm:pt-9',
        )}
      >
        {breadcrumbs && breadcrumbs.length > 0 && (
          <Breadcrumbs items={breadcrumbs} onDark={hero} />
        )}

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <p
            className={clsx(
              'lk-kicker lk-anim text-xs font-semibold uppercase tracking-[0.16em]',
              hero ? 'text-slate-200' : 'text-foreground-muted',
            )}
          >
            {kicker}
          </p>
          {actions && (
            <div className="lk-no-imprimir flex flex-wrap items-center gap-2 sm:justify-end">
              {actions}
            </div>
          )}
        </div>

        <h1
          className={clsx(
            'lk-anim lk-delay-1 max-w-5xl leading-[1.08]',
            hero
              ? 'text-[2rem] text-white sm:text-[2.5rem] lg:text-[3.1rem]'
              : 'text-[1.75rem] text-foreground sm:text-[2.1rem] lg:text-[2.4rem]',
          )}
        >
          {title}
        </h1>

        {lede && (
          <div
            className={clsx(
              'lk-anim lk-delay-2 max-w-3xl text-[15px] leading-relaxed sm:text-base',
              hero ? 'text-slate-300' : 'text-foreground-muted',
            )}
          >
            {lede}
          </div>
        )}

        {stats && <div className="lk-anim lk-delay-3 mt-3">{stats}</div>}
        {footer}
      </div>
    </header>
  );
}

/** El cuerpo de una vista: las tarjetas, con el mismo ancho que la cabecera. */
export function PageBody({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={clsx(CONTAINER, 'flex flex-col gap-6 pt-8', className)}>{children}</div>
  );
}

/** La palabra que el titular quiere que se lea primero. */
export function Highlight({ children }: { children: ReactNode }) {
  return <span className="lk-text-gradient">{children}</span>;
}

/**
 * Un titular escrito por el motor de lecturas, con su énfasis.
 *
 * El énfasis lo decide `insights.ts` (la palabra que carga la conclusión: «en riesgo»,
 * «partida en dos»), no la pantalla. Si no aparece literal en el titular, se pinta sin él.
 */
export function InsightTitle({ insight }: { insight: Insight }) {
  const { emphasis } = insight;
  // Un titular no lleva punto final: es un rótulo, no una oración de párrafo.
  const headline = insight.headline.replace(/\.$/, '');
  const at = emphasis ? headline.indexOf(emphasis) : -1;
  if (!emphasis || at < 0) return <>{headline}</>;
  return (
    <>
      {headline.slice(0, at)}
      <Highlight>{emphasis}</Highlight>
      {headline.slice(at + emphasis.length)}
    </>
  );
}

export function Breadcrumbs({ items, onDark }: { items: Crumb[]; onDark?: boolean }) {
  return (
    <nav aria-label="Ruta" className="lk-no-imprimir">
      <ol
        className={clsx(
          'flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px]',
          onDark ? 'text-slate-300' : 'text-foreground-muted',
        )}
      >
        {items.map((item, index) => {
          const last = index === items.length - 1;
          return (
            <Fragment key={`${item.label}-${index}`}>
              <li>
                {item.href && !last ? (
                  <Link
                    href={item.href}
                    className={clsx(
                      'rounded underline-offset-4 hover:underline',
                      onDark ? 'hover:text-white' : 'hover:text-foreground',
                    )}
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span
                    aria-current={last ? 'page' : undefined}
                    className={clsx('font-medium', onDark ? 'text-white' : 'text-foreground')}
                  >
                    {item.label}
                  </span>
                )}
              </li>
              {!last && (
                <li aria-hidden>
                  <Icon name="chevronRight" size={14} className="opacity-60" />
                </li>
              )}
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}

/* ---------------------------------------------------------------- cifras de cabecera */

export interface StatItem {
  label: string;
  value: ReactNode;
  /** Unidad pegada al valor, más pequeña: «de 100», «min». */
  unit?: string;
  hint?: ReactNode;
  /** Punto de color con su etiqueta, p. ej. la banda del semáforo. */
  tag?: { label: string; color: string } | null;
}

/**
 * Las cifras de la cabecera. Sobre la portada van en vidrio; sobre el plano, en tarjeta.
 * El valor va en cifras proporcionales: a este tamaño los dígitos de ancho fijo dejan
 * huecos y un «11» se ve suelto.
 */
export function StatGrid({ items, onDark }: { items: StatItem[]; onDark?: boolean }) {
  // Dos por fila desde el teléfono: cuatro cifras apiladas en una columna empujan el
  // contenido dos pantallas más abajo.
  const columns =
    items.length >= 4 ? 'grid-cols-2 xl:grid-cols-4' : items.length === 3 ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-2';

  return (
    <dl className={clsx('lk-escalonado grid gap-3', columns)}>
      {items.map((item) => (
        <div
          key={item.label}
          className={clsx(
            'flex min-h-[112px] min-w-0 flex-col gap-1 rounded-2xl px-4 py-3.5 sm:min-h-[124px] sm:px-5 sm:py-4',
            onDark ? 'lk-vidrio' : 'lk-tarjeta',
          )}
        >
          <dd
            className={clsx(
              'flex flex-wrap items-baseline gap-x-1.5 text-[1.6rem] font-semibold leading-tight tracking-tight sm:text-[2rem]',
              onDark ? 'text-white' : 'text-foreground',
            )}
          >
            {item.value}
            {item.unit && (
              <span className={clsx('text-base font-medium', onDark ? 'text-slate-300' : 'text-foreground-muted')}>
                {item.unit}
              </span>
            )}
          </dd>
          <dt className={clsx('text-sm', onDark ? 'text-slate-200' : 'text-foreground')}>
            {item.label}
          </dt>
          {item.tag && (
            <span
              className={clsx(
                'mt-0.5 inline-flex w-fit items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium',
                onDark ? 'bg-white/10 text-white' : 'bg-surface-muted text-foreground',
              )}
            >
              <span
                aria-hidden
                className="size-2 rounded-full"
                style={{ backgroundColor: item.tag.color }}
              />
              {item.tag.label}
            </span>
          )}
          {item.hint && (
            <p className={clsx('text-xs leading-relaxed', onDark ? 'text-slate-400' : 'text-foreground-subtle')}>
              {item.hint}
            </p>
          )}
        </div>
      ))}
    </dl>
  );
}

/* ---------------------------------------------------------------- acciones */

/** Botón de la cabecera: píldora en vidrio sobre la portada, contorno sobre el plano. */
export function HeaderButton({
  icon,
  children,
  onClick,
  href,
  onDark,
  ...rest
}: {
  icon?: IconName;
  children: ReactNode;
  onClick?: () => void;
  href?: string;
  onDark?: boolean;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'>) {
  const className = clsx(
    'inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-medium transition-colors',
    onDark
      ? 'lk-vidrio text-white hover:bg-white/10'
      : 'border border-border-strong bg-surface text-foreground hover:border-brand hover:text-brand',
  );
  if (href) {
    return (
      <a href={href} className={className}>
        {icon && <Icon name={icon} size={17} />}
        {children}
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} className={className} {...rest}>
      {icon && <Icon name={icon} size={17} />}
      {children}
    </button>
  );
}

export function PrintButton({ onDark }: { onDark?: boolean }) {
  return (
    <HeaderButton icon="print" onDark={onDark} onClick={() => window.print()}>
      Imprimir o guardar en PDF
    </HeaderButton>
  );
}

/**
 * «¿Cómo leer?» de la cabecera: una nota corta sobre el método de la vista, a un clic.
 *
 * Es el lugar de lo que un gerente no necesita para decidir pero sí para confiar en el
 * número. Puesta en el cuerpo, competiría con la conclusión; escondida, no se lee nunca.
 */
export function HowToReadButton({
  title,
  children,
  onDark,
}: {
  title: string;
  children: ReactNode;
  onDark?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const wrapper = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointer(event: PointerEvent) {
      if (!wrapper.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={wrapper} className="relative">
      <HeaderButton
        icon="help"
        onDark={onDark}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((current) => !current)}
      >
        ¿Cómo leer?
      </HeaderButton>
      {open && (
        <div
          id={panelId}
          role="region"
          aria-label={title}
          className="absolute top-full right-0 z-40 mt-2 w-[min(360px,calc(100vw-32px))] rounded-[14px] bg-white px-4 py-3.5 text-left text-foreground shadow-[0_0_0_1px_#0f172a14,0_18px_40px_-16px_#06142b59]"
        >
          <p className="text-sm font-semibold">{title}</p>
          <div className="mt-1.5 flex flex-col gap-2 text-[13px] leading-relaxed text-foreground-muted">
            {children}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- secciones */

/**
 * El encabezado de un tramo del cuerpo: antetítulo con el guion de la marca y un titular
 * que ya dice lo que el tramo concluye.
 */
export function SectionHeading({
  kicker,
  title,
  aside,
  id,
}: {
  kicker: string;
  title: ReactNode;
  aside?: ReactNode;
  id?: string;
}) {
  return (
    <div id={id} className="mt-6 flex scroll-mt-20 flex-wrap items-end justify-between gap-x-6 gap-y-2 first:mt-0">
      <div className="flex min-w-0 flex-col gap-2">
        <p className="lk-kicker text-xs font-semibold uppercase tracking-[0.16em] text-foreground-muted">
          {kicker}
        </p>
        <h2 className="text-[1.375rem] leading-tight text-foreground sm:text-[1.6rem]">{title}</h2>
      </div>
      {aside && <div className="lk-no-imprimir shrink-0">{aside}</div>}
    </div>
  );
}

/** Enlace de «ver más» al margen de una sección o al pie de una tarjeta. */
export function MoreLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 text-sm font-semibold text-brand underline-offset-4 hover:underline"
    >
      {children}
      <Icon name="arrowRight" size={15} />
    </Link>
  );
}
