'use client';

import { useMemo, useState } from 'react';
import { LinkticLogo } from '@/components/brand/Logo';
import { PhaseRoadmap } from './PhaseRoadmap';
import type { Identity, SurveySchema } from '@/lib/survey-schema.types';

interface WelcomeStepProps {
  schema: SurveySchema;
  identity: Identity;
  onIdentityChange: (identity: Identity) => void;
  /** Errores por campo de la identificación (`numeroDocumento`, `ownArea`, `respondentRole`). */
  identityErrors?: Record<string, string>;
  /**
   * El borrador ya está abierto: el documento se verificó al empezar y ningún paso lo
   * vuelve a enviar, así que se muestra pero no se edita.
   */
  documentLocked?: boolean;
  onStart: () => void;
  busy?: boolean;
  error?: string | null;
}

const RESPONSE_TYPES = [
  ['Selección única', 'Marque solo una opción.'],
  ['Selección múltiple', 'Marque una o varias opciones, según la instrucción.'],
  ['Escala 0 a 10', 'Seleccione el número que mejor represente su percepción.'],
];

const FIELD_CLASS =
  'min-h-12 rounded-xl border border-border-strong bg-white px-4 text-foreground transition-shadow focus-visible:border-lk-blue focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-lk-blue/15';

export function WelcomeStep({
  schema,
  identity,
  onIdentityChange,
  identityErrors = {},
  documentLocked,
  onStart,
  busy,
  error,
}: WelcomeStepProps) {
  /**
   * El área se elige en dos pasos: primero el proceso (la gestión) y después el subproceso
   * dentro de él. Con más de cincuenta subprocesos, una sola lista obliga a recorrerla
   * entera; el proceso es la pista con la que cada persona se ubica primero.
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

  /**
   * El proceso no se guarda: es solo el camino al subproceso, que es lo que se responde.
   * Arranca en el del subproceso ya elegido, para un borrador retomado o al volver desde la
   * revisión.
   */
  const [procesoCode, setProcesoCode] = useState(
    () => schema.areas.find((area) => area.code === identity.ownArea)?.procesoCode ?? '',
  );

  const subprocesos =
    areasPorGestion.find((grupo) => grupo.proceso.code === procesoCode)?.areas ?? [];

  function elegirProceso(code: string) {
    setProcesoCode(code);
    const areas = areasPorGestion.find((grupo) => grupo.proceso.code === code)?.areas ?? [];
    // Un proceso con un solo subproceso (Comercial, Mejoramiento continuo…) no deja nada
    // que elegir: se marca solo, en vez de pedir un segundo clic obvio.
    onIdentityChange({ ...identity, ownArea: areas.length === 1 ? areas[0].code : '' });
  }

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
       *
       * `grid-cols-1` y no la columna implícita: esa crece hasta la opción más larga de un
       * selector («Sostenibilidad y reputación corporativa») y en el teléfono lo saca de la
       * tarjeta. `grid-cols-1` la deja en el ancho disponible.
       */}
      <div className="grid grid-cols-1 gap-7 lg:grid-cols-2 lg:items-start lg:gap-x-10">
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
              La encuesta es anónima. Su número de documento solo sirve para verificar que
              cada colaborador responda una vez: no queda unido a sus respuestas. El cargo, el
              proceso y el subproceso son necesarios para leer los resultados por área y por
              nivel.
            </p>
          </div>

          {/*
           * Dos filas: quién es (documento y cargo) y dónde trabaja (proceso y luego
           * subproceso). El subproceso queda junto al proceso del que depende.
           */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-foreground">Número de documento</span>
              <input
                type="text"
                inputMode="text"
                autoComplete="off"
                spellCheck={false}
                maxLength={40}
                placeholder="Sin puntos ni espacios"
                value={identity.numeroDocumento}
                disabled={busy}
                readOnly={documentLocked}
                aria-invalid={identityErrors.numeroDocumento ? true : undefined}
                onChange={(event) =>
                  onIdentityChange({ ...identity, numeroDocumento: event.target.value })
                }
                className={`${FIELD_CLASS} read-only:bg-surface-sunken read-only:text-foreground-muted`}
              />
              {identityErrors.numeroDocumento && (
                <span role="alert" className="text-sm text-danger">
                  {identityErrors.numeroDocumento}
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
                className={FIELD_CLASS}
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

            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-foreground">Proceso</span>
              <select
                value={procesoCode}
                disabled={busy}
                aria-invalid={identityErrors.ownArea && !procesoCode ? true : undefined}
                onChange={(event) => elegirProceso(event.target.value)}
                className={FIELD_CLASS}
              >
                <option value="">Seleccione su proceso…</option>
                {areasPorGestion.map(({ proceso }) => (
                  <option key={proceso.code} value={proceso.code}>
                    {proceso.name}
                  </option>
                ))}
              </select>
              {identityErrors.ownArea && !procesoCode && (
                <span role="alert" className="text-sm text-danger">
                  Seleccione su proceso.
                </span>
              )}
            </label>

            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-foreground">Subproceso</span>
              <select
                value={identity.ownArea}
                disabled={busy || !procesoCode}
                aria-invalid={identityErrors.ownArea && procesoCode ? true : undefined}
                onChange={(event) =>
                  onIdentityChange({ ...identity, ownArea: event.target.value })
                }
                className={`${FIELD_CLASS} disabled:bg-surface-sunken disabled:text-foreground-muted`}
              >
                <option value="">
                  {procesoCode ? 'Seleccione su subproceso…' : 'Primero elija el proceso'}
                </option>
                {subprocesos.map((area) => (
                  <option key={area.code} value={area.code}>
                    {area.name}
                  </option>
                ))}
              </select>
              {identityErrors.ownArea && procesoCode && (
                <span role="alert" className="text-sm text-danger">
                  {identityErrors.ownArea}
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
