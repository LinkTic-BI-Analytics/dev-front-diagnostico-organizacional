'use client';

import { useMemo } from 'react';
import { LinkticLogo } from '@/components/brand/Logo';
import { PhaseRoadmap } from './PhaseRoadmap';
import type { Identity, SurveySchema } from '@/lib/survey-schema.types';

interface WelcomeStepProps {
  schema: SurveySchema;
  identity: Identity;
  onIdentityChange: (identity: Identity) => void;
  /** Errores por campo de la identificación (`ownArea`, `respondentRole`). */
  identityErrors?: Record<string, string>;
  onStart: () => void;
  busy?: boolean;
  error?: string | null;
}

const RESPONSE_TYPES = [
  ['Selección única', 'Marque solo una opción.'],
  ['Selección múltiple', 'Marque una o varias opciones, según la instrucción.'],
  ['Escala 0 a 10', 'Seleccione el número que mejor represente su percepción.'],
];

const SELECT_CLASS =
  'min-h-12 rounded-xl border border-border-strong bg-white px-4 text-foreground transition-shadow focus-visible:border-lk-blue focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-lk-blue/15';

export function WelcomeStep({
  schema,
  identity,
  onIdentityChange,
  identityErrors = {},
  onStart,
  busy,
  error,
}: WelcomeStepProps) {
  /**
   * Las áreas se ofrecen agrupadas por gestión. Con más de cincuenta subprocesos, una lista
   * plana obliga a leerla entera para encontrar el propio; la gestión es la pista con la
   * que cada persona se ubica primero.
   */
  const areasPorGestion = useMemo(() => {
    const evaluables = schema.areas.filter((area) => area.isEvaluable);
    return schema.procesos
      .map((proceso) => ({
        proceso,
        areas: evaluables.filter((area) => area.procesoCode === proceso.code),
      }))
      .filter((grupo) => grupo.areas.length > 0);
  }, [schema.areas, schema.procesos]);

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
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="mt-0.5 shrink-0 text-brand"><path d="M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6z M9 12l2 2 4-4" /></svg>
        <p className="text-sm text-foreground">
          La información recopilada será utilizada exclusivamente con fines de mejora
          organizacional y fortalecimiento institucional.
        </p>
      </div>

      <PhaseRoadmap />

      {/*
       * Instrucciones e identificación son dos cosas cortas y sin relación entre sí: una se
       * lee una vez y la otra se rellena. En PC van lado a lado para que «Empezar» entre en
       * la primera pantalla; apiladas, la bienvenida pide dos scrolls antes del botón.
       */}
      <div className="grid gap-7 lg:grid-cols-2 lg:items-start lg:gap-x-10">
        <div className="flex flex-col gap-3">
          <h2 className="text-[15px] text-foreground">Cómo se responde</h2>
          <ul className="flex flex-col gap-2 rounded-xl border border-border-subtle bg-surface-sunken p-4">
            {RESPONSE_TYPES.map(([type, use]) => (
              <li key={type} className="flex flex-col gap-0.5 text-sm sm:flex-row sm:gap-3">
                <span className="font-medium text-foreground sm:w-40 sm:shrink-0">{type}</span>
                <span className="text-foreground-muted">{use}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col gap-4 border-t border-border-subtle pt-6 lg:border-t-0 lg:pt-0">
          <div className="flex flex-col gap-1">
            <h2 className="text-[15px] text-foreground">Identificación</h2>
            <p className="text-xs text-foreground-muted">
              La encuesta es anónima: no se pide su nombre. El área y el cargo son necesarios
              para leer los resultados por proceso y por nivel.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-foreground">¿A qué área pertenece?</span>
              <select
                value={identity.ownArea}
                disabled={busy}
                aria-invalid={identityErrors.ownArea ? true : undefined}
                onChange={(event) =>
                  onIdentityChange({ ...identity, ownArea: event.target.value })
                }
                className={SELECT_CLASS}
              >
                <option value="">Seleccione su área…</option>
                {areasPorGestion.map(({ proceso, areas }) => (
                  <optgroup key={proceso.code} label={proceso.name}>
                    {areas.map((area) => (
                      <option key={area.code} value={area.code}>
                        {area.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              {identityErrors.ownArea && (
                <span role="alert" className="text-sm text-danger">
                  {identityErrors.ownArea}
                </span>
              )}
            </label>

            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-foreground">Cargo</span>
              <select
                value={identity.respondentRole}
                disabled={busy}
                aria-invalid={identityErrors.respondentRole ? true : undefined}
                onChange={(event) =>
                  onIdentityChange({ ...identity, respondentRole: event.target.value })
                }
                className={SELECT_CLASS}
              >
                <option value="">Seleccione su cargo…</option>
                {schema.roles.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
              {identityErrors.respondentRole && (
                <span role="alert" className="text-sm text-danger">
                  {identityErrors.respondentRole}
                </span>
              )}
            </label>
          </div>
        </div>
      </div>

      {error && (
        <p role="alert" className="rounded-xl bg-danger-subtle px-4 py-3 text-sm text-danger">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={onStart}
        disabled={busy}
        className="lk-button inline-flex min-h-12 items-center gap-2 self-start rounded-xl px-7 text-[15px] font-semibold"
      >
        {busy ? 'Preparando…' : 'Empezar el bloque 1'}
        {!busy && (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 12h14 M13 6l6 6-6 6" />
          </svg>
        )}
      </button>
    </section>
  );
}
