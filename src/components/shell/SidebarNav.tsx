'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import { Icon } from '@/components/ui/icons';
import { useCatalog, type Gestion } from '@/lib/use-catalog';
import { ANALYSIS_NAV, AREAS_INDEX, OPERATION_NAV, isActive, type NavItem } from './nav-config';

/**
 * La navegación del panel, compartida por el menú lateral y el cajón móvil.
 *
 * Tres tramos, como en la línea gráfica de referencia: el análisis de la empresa, las
 * áreas (agrupadas por gestión, igual que en la encuesta: con más de cincuenta subprocesos
 * la gestión es la pista con la que cada quien se ubica) y la operación. `collapsed` deja
 * solo los iconos; el nombre sigue ahí para el lector de pantalla y en el `title`.
 */
export function SidebarNav({
  collapsed = false,
  onNavigate,
}: {
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const { gestiones, areaCount } = useCatalog();

  return (
    <nav aria-label="Secciones del panel" className="flex flex-col gap-6">
      <NavGroup title="Diagnóstico" collapsed={collapsed}>
        {ANALYSIS_NAV.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            active={isActive(item, pathname)}
            collapsed={collapsed}
            onNavigate={onNavigate}
          />
        ))}
      </NavGroup>

      <NavGroup title="Áreas" collapsed={collapsed}>
        <NavLink
          item={{ ...AREAS_INDEX, badge: areaCount ? String(areaCount) : undefined }}
          active={pathname === AREAS_INDEX.href}
          collapsed={collapsed}
          onNavigate={onNavigate}
        />
        {!collapsed &&
          gestiones.map((gestion) => (
            <GestionItem
              key={gestion.code}
              gestion={gestion}
              pathname={pathname}
              onNavigate={onNavigate}
            />
          ))}
      </NavGroup>

      <NavGroup title="Operación" collapsed={collapsed}>
        {OPERATION_NAV.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            active={isActive(item, pathname)}
            collapsed={collapsed}
            onNavigate={onNavigate}
          />
        ))}
      </NavGroup>
    </nav>
  );
}

function NavGroup({
  title,
  collapsed,
  children,
}: {
  title: string;
  collapsed: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      {collapsed ? (
        <span aria-hidden className="mx-auto mb-1 h-px w-8 bg-white/10" />
      ) : (
        <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
          {title}
        </p>
      )}
      <ul className="flex flex-col gap-0.5">{children}</ul>
    </div>
  );
}

const LINK_BASE =
  'group relative flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm transition-colors';

function NavLink({
  item,
  active,
  collapsed,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  return (
    <li>
      <Link
        href={item.href}
        onClick={onNavigate}
        aria-current={active ? 'page' : undefined}
        title={collapsed ? item.label : undefined}
        className={clsx(
          LINK_BASE,
          collapsed && 'justify-center px-0',
          active
            ? 'bg-white/10 font-medium text-white'
            : 'text-slate-300 hover:bg-white/5 hover:text-white',
        )}
      >
        {active && <ActiveBar />}
        <Icon name={item.icon} size={19} className="shrink-0" />
        <span className={clsx('min-w-0 flex-1 leading-snug', collapsed && 'sr-only')}>
          {item.label}
        </span>
        {!collapsed && item.badge && <Badge>{item.badge}</Badge>}
        {item.live && <LiveMark collapsed={collapsed} />}
      </Link>
    </li>
  );
}

/**
 * Una gestión del menú. Las que tienen un solo subproceso enlazan directo a su ficha: un
 * desplegable con una sola opción es un clic de más sin nada que elegir.
 */
function GestionItem({
  gestion,
  pathname,
  onNavigate,
}: {
  gestion: Gestion;
  pathname: string;
  onNavigate?: () => void;
}) {
  const containsActive = gestion.areas.some(
    (area) => pathname === `/admin/areas/${area.code}`,
  );
  // Mientras nadie la toque, la gestión está abierta si contiene la ficha que se está
  // viendo: al llegar desde el buscador o desde un enlace del mapa, el menú dice dónde está
  // uno. En cuanto se pulsa, manda lo que se eligió.
  const [manual, setManual] = useState<boolean | null>(null);
  const open = manual ?? containsActive;

  if (gestion.areas.length === 1) {
    const area = gestion.areas[0];
    return (
      <NavLink
        item={{ href: `/admin/areas/${area.code}`, label: gestion.shortName, icon: 'building' }}
        active={pathname === `/admin/areas/${area.code}`}
        collapsed={false}
        onNavigate={onNavigate}
      />
    );
  }

  const panelId = `gestion-${gestion.code}`;

  return (
    <li>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setManual(!open)}
        className={clsx(
          LINK_BASE,
          'w-full text-left',
          containsActive && !open
            ? 'bg-white/10 text-white'
            : 'text-slate-300 hover:bg-white/5 hover:text-white',
        )}
      >
        <Icon name="building" size={19} className="shrink-0" />
        <span className="min-w-0 flex-1 leading-snug">{gestion.shortName}</span>
        <Badge>{gestion.areas.length}</Badge>
        <Icon
          name="chevronDown"
          size={16}
          className={clsx(
            'shrink-0 text-slate-400 transition-transform duration-200',
            open && 'rotate-180',
          )}
        />
      </button>

      {open && (
        <ul id={panelId} className="mt-0.5 flex flex-col gap-0.5">
          {gestion.areas.map((area) => {
            const href = `/admin/areas/${area.code}`;
            const active = pathname === href;
            return (
              <li key={area.code}>
                <Link
                  href={href}
                  onClick={onNavigate}
                  aria-current={active ? 'page' : undefined}
                  className={clsx(
                    'relative flex min-h-10 items-center rounded-xl py-1.5 pr-3 pl-11 text-[13px] leading-snug transition-colors',
                    active
                      ? 'bg-white/10 font-medium text-white'
                      : 'text-slate-300 hover:bg-white/5 hover:text-white',
                  )}
                >
                  {active && <ActiveBar />}
                  {area.name}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </li>
  );
}

/** El filete vertical con el degradado de marca que señala la vista abierta. */
function ActiveBar() {
  return (
    <span
      aria-hidden
      className="absolute inset-y-2 left-0 w-1 rounded-r"
      style={{ background: 'var(--lk-degradado-marca-vertical)' }}
    />
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="shrink-0 rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-medium tabular-nums text-slate-200">
      {children}
    </span>
  );
}

function LiveMark({ collapsed }: { collapsed: boolean }) {
  if (collapsed) {
    return (
      <span aria-hidden className="absolute top-2.5 right-3.5 size-2 rounded-full bg-lk-green">
        <span className="lk-en-vivo absolute inset-0 rounded-full bg-lk-green" />
      </span>
    );
  }
  return (
    <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-lk-green/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-300">
      <span aria-hidden className="lk-en-vivo relative size-1.5 rounded-full bg-lk-green" />
      En vivo
    </span>
  );
}

