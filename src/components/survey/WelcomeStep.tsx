'use client';

import { LinkticLogo } from '@/components/brand/Logo';
import { Icon } from '@/components/ui/icons';
import { IdentityDialog } from './IdentityDialog';
import { PhaseRoadmap } from './PhaseRoadmap';
import type { Identity, SurveySchema } from '@/lib/survey-schema.types';
import type { IdentityAlert } from './useSurveyWizard';

interface WelcomeStepProps {
  schema: SurveySchema;
  identity: Identity;
  onIdentityChange: (identity: Identity) => void;
  /** Errores por campo de la identificación (`numeroDocumento`, `ownArea`, `respondentRole`). */
  identityErrors?: Record<string, string>;
  identityAlert?: IdentityAlert | null;
  identityOpen: boolean;
  onOpenIdentity: () => void;
  onCloseIdentity: () => void;
  /**
   * El borrador ya está abierto: se volvió a la bienvenida con «Atrás». El botón sigue sin
   * volver a pedir los datos, el documento ya no se edita y lo demás se corrige desde
   * «Revisar mis datos».
   */
  started?: boolean;
  /** Confirma la identificación: abre el borrador, o sigue al componente 1 si ya existe. */
  onSubmitIdentity: () => void;
  busy?: boolean;
  error?: string | null;
}

const RESPONSE_TYPES = [
  ['Selección única', 'Marque solo una opción.'],
  ['Selección múltiple', 'Marque una o varias opciones, según la instrucción.'],
  ['Escala 0 a 10', 'Seleccione el número que mejor represente su percepción.'],
];

/**
 * La bienvenida: lo que se lee antes de empezar (el propósito, los cuatro bloques y cómo se
 * responde). La identificación ya no vive aquí: «Empezar» abre una ventana que la pide y la
 * verifica, así la primera pantalla no arranca con un formulario.
 */
export function WelcomeStep({
  schema,
  identity,
  onIdentityChange,
  identityErrors = {},
  identityAlert = null,
  identityOpen,
  onOpenIdentity,
  onCloseIdentity,
  started,
  onSubmitIdentity,
  busy,
  error,
}: WelcomeStepProps) {
  return (
    <section className="flex flex-col gap-7" aria-labelledby="welcome-title">
      <header className="flex flex-col gap-3">
        <LinkticLogo width={170} priority className="mb-2" />
        <p className="lk-kicker text-xs font-semibold uppercase tracking-[0.16em] text-foreground-muted">
          Encuesta interna de percepción organizacional
        </p>
        <h1 id="welcome-title" className="lk-text-gradient max-w-3xl text-[2rem] leading-[1.1] sm:text-[2.6rem]">
          Instrumento de Diagnóstico Organizacional
        </h1>
        <p className="max-w-prose text-[15px] leading-relaxed text-foreground-muted">
          Este instrumento tiene como propósito comprender la forma en que interactúan las
          áreas de la organización, identificar fortalezas y oportunidades de mejora en la
          colaboración interna, y generar información estratégica para fortalecer la
          capacidad de respuesta, la integración de procesos y la cultura de servicio.
        </p>
      </header>

      <div className="flex items-start gap-3 rounded-xl bg-brand-subtle px-4 py-3">
        <Icon name="shield" size={18} className="mt-0.5 shrink-0 text-brand" />
        <p className="text-sm text-foreground">
          La información recopilada será utilizada exclusivamente con fines de mejora
          organizacional y fortalecimiento institucional.
        </p>
      </div>

      <PhaseRoadmap />

      <div className="flex flex-col gap-3">
        <h2 className="text-[15px] text-foreground">Cómo se responde</h2>
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {RESPONSE_TYPES.map(([type, use]) => (
            <li
              key={type}
              className="flex flex-col gap-1 rounded-xl border border-border-subtle bg-surface-sunken px-4 py-3 text-sm"
            >
              <span className="font-medium text-foreground">{type}</span>
              <span className="text-foreground-muted">{use}</span>
            </li>
          ))}
        </ul>
      </div>

      {error && (
        <p role="alert" className="rounded-xl bg-danger-subtle px-4 py-3 text-sm text-danger">
          {error}
        </p>
      )}

      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-5">
        <button
          type="button"
          onClick={started ? onSubmitIdentity : onOpenIdentity}
          disabled={busy}
          className="lk-button inline-flex min-h-12 items-center gap-2 rounded-xl px-7 text-[15px] font-semibold"
        >
          {started ? 'Continuar' : 'Empezar la encuesta'}
          <Icon name="arrowRight" size={16} strokeWidth={2} />
        </button>
        {started && (
          <button
            type="button"
            onClick={onOpenIdentity}
            disabled={busy}
            className="text-sm font-medium text-brand hover:underline disabled:opacity-50"
          >
            Revisar mis datos de identificación
          </button>
        )}
      </div>

      <IdentityDialog
        open={identityOpen}
        schema={schema}
        identity={identity}
        onIdentityChange={onIdentityChange}
        identityErrors={identityErrors}
        alert={identityAlert}
        documentLocked={started}
        busy={busy}
        submitLabel={started ? 'Continuar' : 'Empezar el bloque 1'}
        onSubmit={onSubmitIdentity}
        onClose={onCloseIdentity}
      />
    </section>
  );
}
