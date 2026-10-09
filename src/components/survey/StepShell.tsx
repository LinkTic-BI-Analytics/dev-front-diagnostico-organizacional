'use client';

import type { ReactNode } from 'react';
import { CheckIcon } from './PhaseIcon';

interface StepShellProps {
  title: string;
  /** Texto introductorio del componente, literal del instrumento. */
  intro?: string | null;
  /** La cinta o el hito del bloque. Va encima del título. */
  banner?: ReactNode;
  /** Progreso secundario dentro del paso, p. ej. "Área 2 de 4". */
  subProgress?: ReactNode;
  /** Cuántas preguntas del paso están respondidas. */
  answered?: { done: number; total: number };
  children: ReactNode;
  onBack?: () => void;
  onNext: () => void;
  nextLabel?: string;
  backLabel?: string;
  busy?: boolean;
  error?: string | null;
}

export function StepShell({
  title,
  intro,
  banner,
  subProgress,
  answered,
  children,
  onBack,
  onNext,
  nextLabel = 'Continuar',
  backLabel = 'Atrás',
  busy,
  error,
}: StepShellProps) {
  const complete = answered ? answered.done >= answered.total : false;

  return (
    <section className="flex flex-col gap-6" aria-labelledby="step-title">
      {banner}

      <header className="flex flex-col gap-2">
        {/*
         * El título lleva el color del bloque. Es el elemento más grande de la pantalla,
         * así que es el que hace visible de un golpe que se cambió de terreno; el resto
         * del color (cinta, escala, botón) lo confirma.
         */}
        <h2 id="step-title" className="text-[1.5rem] leading-tight tracking-tight text-phase sm:text-[1.85rem]">
          {title}
        </h2>
        {intro && (
          <p className="max-w-prose text-sm leading-relaxed text-foreground-muted">
            {intro}
          </p>
        )}
      </header>

      {subProgress}

      <div className="flex flex-col gap-7">{children}</div>

      {error && (
        <p role="alert" className="rounded-xl bg-danger-subtle px-4 py-3 text-sm text-danger">
          {error}
        </p>
      )}

      {/*
       * El pie queda pegado abajo: con cinco escalas de 0 a 10, en un móvil el botón de
       * continuar cae fuera de pantalla y hay que ir a buscarlo. Pegado, el siguiente paso
       * está siempre a un toque, y al lado se ve que lo respondido ya quedó guardado.
       */}
      <footer className="sticky bottom-0 z-10 -mx-5 -mb-7 flex flex-col gap-2.5 rounded-b-2xl border-t border-border-subtle bg-white/95 px-5 pt-3.5 pb-5 backdrop-blur-sm sm:-mx-8 sm:-mb-9 sm:px-8">
        <div className="flex items-center justify-between gap-3 text-xs text-foreground-muted">
          <span className="flex items-center gap-1.5">
            <CheckIcon size={12} className="shrink-0 text-phase" />
            Se guarda al continuar · puede cerrar y seguir después
          </span>
          {answered && answered.total > 0 && (
            <span className={complete ? 'font-medium text-phase' : undefined}>
              {answered.done} de {answered.total}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between gap-3">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              disabled={busy}
              className="min-h-12 rounded-xl px-4 text-sm font-medium text-foreground-muted hover:bg-surface-muted hover:text-foreground disabled:opacity-50"
            >
              {backLabel}
            </button>
          ) : (
            <span />
          )}

          <button
            type="button"
            onClick={onNext}
            disabled={busy}
            className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-phase px-6 text-sm font-semibold text-phase-on shadow-[0_10px_24px_-14px_var(--phase-ink)] transition-[background-color,transform] hover:-translate-y-px hover:bg-phase-hover active:scale-[0.98] disabled:translate-y-0 disabled:opacity-60"
          >
            {busy ? 'Guardando…' : nextLabel}
            {!busy && (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12h14 M13 6l6 6-6 6" />
              </svg>
            )}
          </button>
        </div>
      </footer>
    </section>
  );
}

/** Envuelve una pregunta con su etiqueta y su ayuda. */
export function QuestionBlock({
  label,
  helpText,
  required,
  children,
}: {
  label: string;
  helpText?: string | null;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3">
      {/*
       * El enunciado y su ayuda se leen, no se recorren: se quedan en su medida aunque la
       * pantalla dé para más. Lo que aprovecha el ancho es lo que viene debajo.
       */}
      <div className="flex max-w-prose flex-col gap-1">
        <p className="text-[15px] font-semibold leading-snug text-foreground">
          {label}
          {!required && (
            <span className="ml-2 text-xs font-normal text-foreground-muted">(opcional)</span>
          )}
        </p>
        {helpText && <p className="text-[13px] text-foreground-muted">{helpText}</p>}
      </div>
      {children}
    </div>
  );
}
