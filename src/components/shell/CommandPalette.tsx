'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';
import { Icon, type IconName } from '@/components/ui/icons';
import { useCatalog } from '@/lib/use-catalog';
import { ANALYSIS_NAV, AREAS_INDEX, OPERATION_NAV } from './nav-config';

interface Entry {
  id: string;
  label: string;
  kind: string;
  href: string;
  icon: IconName;
  haystack: string;
}

/** Sin tildes ni mayúsculas: «gestion» tiene que encontrar «Gestión». */
function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

/**
 * El buscador del panel (⌘K / Ctrl+K).
 *
 * Con doce gestiones y veinticuatro subprocesos, buscar es más corto que navegar: quien
 * quiere la ficha de «Preventa» la escribe, no la busca abriendo gestiones. Indexa las
 * vistas del panel (también por palabras clave: «excel» lleva al monitoreo, donde está la
 * descarga) y todo el organigrama.
 *
 * Es un `<dialog>` nativo: el foco queda atrapado dentro, Escape lo cierra y el resto de
 * la página queda inerte sin escribir nada de eso a mano.
 */
export function CommandPalette({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const { gestiones } = useCatalog();

  const entries = useMemo<Entry[]>(() => {
    const pages = [...ANALYSIS_NAV, AREAS_INDEX, ...OPERATION_NAV].map((item) => ({
      id: item.href,
      label: item.label,
      kind: 'Vista',
      href: item.href,
      icon: item.icon,
      haystack: normalize(`${item.label} ${item.keywords ?? ''}`),
    }));
    const areas = gestiones.flatMap((gestion) =>
      gestion.areas.map((area) => ({
        id: `area-${area.code}`,
        label: area.name,
        kind: `Área · ${gestion.shortName}`,
        href: `/admin/areas/${area.code}`,
        icon: 'building' as const,
        haystack: normalize(`${area.name} ${gestion.name}`),
      })),
    );
    return [...pages, ...areas];
  }, [gestiones]);

  const results = useMemo(() => {
    const terms = normalize(query).split(/\s+/).filter(Boolean);
    if (terms.length === 0) return entries.slice(0, 8);
    return entries.filter((entry) => terms.every((term) => entry.haystack.includes(term))).slice(0, 12);
  }, [entries, query]);

  const active = Math.min(cursor, Math.max(results.length - 1, 0));

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      inputRef.current?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  function reset() {
    setQuery('');
    setCursor(0);
  }

  function go(entry: Entry | undefined) {
    if (!entry) return;
    onClose();
    reset();
    router.push(entry.href);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setCursor((current) => Math.min(current + 1, results.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setCursor((current) => Math.max(current - 1, 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      go(results[active]);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      aria-label="Buscar en el panel"
      onClose={() => {
        onClose();
        reset();
      }}
      // Un clic en el telón (fuera de la caja) cierra, como en cualquier buscador.
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose();
      }}
      className="m-auto mt-[8vh] w-[min(620px,calc(100vw-24px))] max-w-none overflow-hidden rounded-[18px] bg-white p-0 text-foreground shadow-[0_0_0_1px_#0f172a14,0_32px_64px_-24px_#06142b73] backdrop:bg-navy-950/50"
    >
      <div className="flex items-center gap-3 border-b border-border-subtle px-4">
        <Icon name="search" size={18} className="shrink-0 text-foreground-subtle" />
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setCursor(0);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Buscar una vista o un área…"
          aria-label="Buscar una vista o un área"
          role="combobox"
          aria-expanded="true"
          aria-controls={listId}
          aria-activedescendant={results[active] ? `${listId}-${results[active].id}` : undefined}
          className="h-14 min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-foreground-subtle focus-visible:outline-none"
        />
        <kbd className="shrink-0 rounded-md border border-border-subtle px-1.5 py-0.5 text-[11px] font-medium text-foreground-subtle">
          Esc
        </kbd>
      </div>

      <ul id={listId} role="listbox" className="max-h-[min(60dvh,440px)] overflow-y-auto p-2">
        {results.length === 0 ? (
          <li className="px-3 py-6 text-center text-sm text-foreground-muted">
            Nada coincide con «{query}».
          </li>
        ) : (
          results.map((entry, index) => (
            <li
              key={entry.id}
              id={`${listId}-${entry.id}`}
              role="option"
              aria-selected={index === active}
              onMouseEnter={() => setCursor(index)}
              onClick={() => go(entry)}
              className={clsx(
                'flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5',
                index === active ? 'bg-brand-subtle' : 'hover:bg-surface-muted',
              )}
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-surface-muted text-brand">
                <Icon name={entry.icon} size={16} />
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm font-medium text-foreground">{entry.label}</span>
                <span className="truncate text-xs text-foreground-subtle">{entry.kind}</span>
              </span>
              {index === active && (
                <Icon name="arrowRight" size={16} className="shrink-0 text-brand" />
              )}
            </li>
          ))
        )}
      </ul>
    </dialog>
  );
}
