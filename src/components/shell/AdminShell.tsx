'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import { LinkticIsotipo } from '@/components/brand/Logo';
import { Icon } from '@/components/ui/icons';
import { getOverview, logout } from '@/lib/admin-client';
import { formatDate } from '@/lib/score-scale';
import { useCatalog } from '@/lib/use-catalog';
import { CommandPalette } from './CommandPalette';
import { SidebarNav } from './SidebarNav';
import { ANALYSIS_NAV, AREAS_INDEX, OPERATION_NAV, isActive } from './nav-config';

const COLLAPSE_KEY = 'linktic-menu';

/*
 * La preferencia de menú colapsado es del navegador de cada quien, no de la cuenta: va en
 * `localStorage`, envuelto en `try` porque en navegación privada leerlo lanza. Se lee con
 * `useSyncExternalStore` para que el servidor (que no la conoce) pinte el menú abierto y
 * el cliente lo corrija al hidratar sin desajuste.
 */
const collapseListeners = new Set<() => void>();

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(COLLAPSE_KEY) === 'colapsado';
  } catch {
    return false;
  }
}

function writeCollapsed(value: boolean) {
  try {
    localStorage.setItem(COLLAPSE_KEY, value ? 'colapsado' : 'expandido');
  } catch {
    // Sin almacenamiento la preferencia dura lo que la pestaña.
  }
  for (const listener of collapseListeners) listener();
}

function subscribeCollapsed(listener: () => void) {
  collapseListeners.add(listener);
  return () => collapseListeners.delete(listener);
}

/**
 * El chrome del panel: menú lateral navy en escritorio, barra superior con cajón en móvil,
 * y el buscador. Cada vista pinta su propia cabecera; aquí solo vive lo que se repite.
 */
export function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const collapsed = useSyncExternalStore(subscribeCollapsed, readCollapsed, () => false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  // El corte de datos del pie del menú. Es la misma consulta que abre el resumen, así que
  // no cuesta una petición aparte.
  const overview = useQuery({ queryKey: ['overview'], queryFn: () => getOverview() });
  const meta = overview.data?.meta;

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setSearchOpen(true);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  async function handleLogout() {
    try {
      await logout();
    } finally {
      router.push('/login');
    }
  }

  // El pie del menú: en el cajón móvil va siempre expandido, aunque en escritorio no.
  const footer = (compact: boolean) => (
    <div className="flex flex-col gap-1 border-t border-white/10 px-3 pt-4">
      {!compact && (
        <div className="px-3 pb-2">
          <p className="text-[11px] text-slate-400">Corte de datos</p>
          <p className="text-[13px] text-slate-200">
            {meta ? formatDate(meta.generatedAt) : '—'}
            {meta && (
              <span className="text-slate-400">
                {' '}
                · {meta.n} {meta.n === 1 ? 'respuesta' : 'respuestas'}
              </span>
            )}
          </p>
        </div>
      )}
      <button
        type="button"
        onClick={() => void handleLogout()}
        title={compact ? 'Salir' : undefined}
        className={clsx(
          'flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm text-slate-300 transition-colors hover:bg-white/5 hover:text-white',
          compact && 'justify-center px-0',
        )}
      >
        <Icon name="logout" size={19} />
        <span className={compact ? 'sr-only' : undefined}>Salir</span>
      </button>
    </div>
  );

  return (
    <div className="flex min-h-dvh">
      <a href="#contenido" className="lk-saltar">
        Saltar al contenido
      </a>

      {/* ---------- Menú lateral (escritorio) ---------- */}
      <aside
        className={clsx(
          'lk-menu lk-sobre-oscuro lk-no-imprimir sticky top-0 hidden h-dvh shrink-0 flex-col py-4 transition-[width] duration-300 lg:flex',
          collapsed ? 'w-[76px]' : 'w-[280px]',
        )}
      >
        <div
          className={clsx(
            'flex items-center gap-3 px-5 pb-4',
            collapsed && 'flex-col gap-4 px-0',
          )}
        >
          <Link href="/admin" className="flex min-w-0 flex-1 items-center gap-3" title="Resumen ejecutivo">
            <LinkticIsotipo height={30} surface="dark" priority />
            {!collapsed && (
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-[15px] font-semibold text-white">
                  Diagnóstico LinkTIC
                </span>
                <span className="truncate text-xs text-slate-400">Organizacional</span>
              </span>
            )}
          </Link>
          <button
            type="button"
            onClick={() => writeCollapsed(!collapsed)}
            aria-label={collapsed ? 'Expandir el menú' : 'Contraer el menú'}
            aria-pressed={collapsed}
            className="flex size-9 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
          >
            <Icon name={collapsed ? 'chevronRight' : 'panelLeft'} size={18} />
          </button>
        </div>

        <div className="px-3 pb-5">
          <SearchButton collapsed={collapsed} onClick={() => setSearchOpen(true)} />
        </div>

        <div className="lk-scroll-menu min-h-0 flex-1 overflow-y-auto px-3 pb-4 [scrollbar-color:#ffffff33_transparent] [scrollbar-width:thin]">
          <SidebarNav collapsed={collapsed} />
        </div>

        {footer(collapsed)}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* ---------- Barra superior (móvil) ---------- */}
        <header className="lk-barra-superior lk-sobre-oscuro lk-no-imprimir sticky top-0 z-30 flex h-14 items-center gap-2 px-2 lg:hidden">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Abrir el menú"
            className="flex size-11 items-center justify-center rounded-lg text-white"
          >
            <Icon name="menu" size={22} />
          </button>
          <p className="min-w-0 flex-1 truncate text-[15px] font-semibold text-white">
            <CurrentTitle pathname={pathname} />
          </p>
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            aria-label="Buscar en el panel"
            className="flex size-11 items-center justify-center rounded-lg text-white"
          >
            <Icon name="search" size={20} />
          </button>
        </header>

        <main id="contenido" className="flex flex-1 flex-col">
          {children}
        </main>

        <footer className="mx-auto mt-12 flex w-full max-w-[1240px] flex-col gap-1 border-t border-border-subtle px-4 py-5 text-xs text-foreground-muted sm:flex-row sm:justify-between sm:px-6 lg:px-8">
          <p>Corte de datos: {meta ? formatDate(meta.generatedAt) : '—'}</p>
          <p>Diagnóstico Organizacional LinkTIC · Documento confidencial</p>
        </footer>
      </div>

      <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} footer={footer(false)} />
      <CommandPalette open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}

function SearchButton({ collapsed, onClick }: { collapsed: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={collapsed ? 'Buscar (⌘K)' : undefined}
      className={clsx(
        'flex min-h-11 w-full items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-slate-300 transition-colors hover:bg-white/10 hover:text-white',
        collapsed && 'justify-center px-0',
      )}
    >
      <Icon name="search" size={18} className="shrink-0" />
      <span className={clsx('flex-1 text-left', collapsed && 'sr-only')}>Buscar en el panel</span>
      {!collapsed && (
        <kbd className="rounded-md border border-white/15 px-1.5 py-0.5 text-[11px] font-medium text-slate-400">
          ⌘K
        </kbd>
      )}
    </button>
  );
}

/** El nombre de la vista abierta, para la barra móvil (donde no cabe el menú). */
function CurrentTitle({ pathname }: { pathname: string }) {
  const { gestiones } = useCatalog();
  const item = [...ANALYSIS_NAV, ...OPERATION_NAV].find((entry) => isActive(entry, pathname));
  if (item) return <>{item.label}</>;
  const code = pathname.match(/^\/admin\/areas\/([^/]+)/)?.[1];
  if (code) {
    const area = gestiones.flatMap((gestion) => gestion.areas).find((entry) => entry.code === code);
    return <>{area?.name ?? 'Ficha de área'}</>;
  }
  if (pathname === AREAS_INDEX.href) return <>{AREAS_INDEX.label}</>;
  return <>Diagnóstico LinkTIC</>;
}

/**
 * El menú en móvil: un cajón desde la izquierda. Es un `<dialog>` modal, así que el foco
 * queda dentro, Escape lo cierra y la página de atrás no se desplaza mientras está abierto.
 */
function MobileDrawer({
  open,
  onClose,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  footer: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-label="Menú del panel"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
      className="lk-menu lk-sobre-oscuro m-0 h-dvh max-h-none w-[min(88vw,340px)] max-w-none flex-col py-4 text-white backdrop:bg-navy-950/60 open:flex lg:hidden"
    >
      <div className="flex items-center gap-3 px-5 pb-5">
        <LinkticIsotipo height={28} surface="dark" />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-[15px] font-semibold text-white">Diagnóstico LinkTIC</span>
          <span className="truncate text-xs text-slate-400">Organizacional</span>
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar el menú"
          className="flex size-10 items-center justify-center rounded-lg text-slate-300 hover:bg-white/5 hover:text-white"
        >
          <Icon name="close" size={20} />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
        <SidebarNav onNavigate={onClose} />
      </div>
      {footer}
    </dialog>
  );
}
