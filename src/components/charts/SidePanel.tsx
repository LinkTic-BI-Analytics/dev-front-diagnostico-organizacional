'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { Icon } from '@/components/ui/icons';

/**
 * El panel de detalle: se abre al tocar una burbuja o una fila y muestra lo que hay
 * detrás sin sacar al lector de la vista. A la derecha en escritorio, desde abajo en el
 * teléfono, donde un cajón lateral taparía todo.
 *
 * Es un `<dialog>` modal: atrapa el foco, Escape lo cierra y al cerrarse el foco vuelve a
 * lo que lo abrió.
 */
export function SidePanel({
  open,
  onClose,
  kicker,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  kicker?: string;
  title: ReactNode;
  children: ReactNode;
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
      onClose={onClose}
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
      aria-labelledby="panel-titulo"
      className="fixed inset-x-0 top-auto bottom-0 m-0 max-h-[88dvh] w-full max-w-none flex-col overflow-hidden rounded-t-[20px] bg-white p-0 text-foreground shadow-[0_-24px_48px_-24px_#06142b59] backdrop:bg-navy-950/45 open:flex sm:inset-y-0 sm:right-0 sm:left-auto sm:h-dvh sm:max-h-none sm:w-[min(440px,100vw)] sm:rounded-none sm:shadow-[-24px_0_48px_-24px_#06142b59]"
    >
      <div aria-hidden className="lk-accent-bar h-1.5 shrink-0" />
      <header className="flex items-start gap-3 border-b border-border-subtle px-5 py-4">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          {kicker && (
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground-subtle">
              {kicker}
            </p>
          )}
          <h2 id="panel-titulo" className="text-lg leading-snug text-foreground">
            {title}
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar el detalle"
          className="flex size-10 shrink-0 items-center justify-center rounded-full text-foreground-muted hover:bg-surface-muted hover:text-foreground"
        >
          <Icon name="close" size={20} />
        </button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">{children}</div>
    </dialog>
  );
}
