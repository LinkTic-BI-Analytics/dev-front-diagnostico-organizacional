'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '@/components/ui/icons';
import type { Identity, SurveySchema } from '@/lib/survey-schema.types';
import type { IdentityAlert } from './useSurveyWizard';

interface IdentityDialogProps {
  open: boolean;
  schema: SurveySchema;
  identity: Identity;
  onIdentityChange: (identity: Identity) => void;
  /** Errores por campo (`numeroDocumento`, `ownArea`, `respondentRole`). */
  identityErrors: Record<string, string>;
  /** Qué pasó en el último intento: «Persona no registrada», «Ya participó»… */
  alert: IdentityAlert | null;
  /**
   * El borrador ya está abierto: el documento se verificó al empezar y ningún paso lo
   * vuelve a enviar, así que se muestra pero no se edita.
   */
  documentLocked?: boolean;
  busy?: boolean;
  submitLabel: string;
  onSubmit: () => void;
  onClose: () => void;
}

const FIELD_CLASS =
  'min-h-12 w-full rounded-xl border border-border-strong bg-white px-4 text-foreground transition-shadow focus-visible:border-lk-blue focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-lk-blue/15';

/**
 * La ventana de identificación. Se abre al pulsar «Empezar»: la bienvenida queda para lo que
 * se lee, y los datos se piden aparte, justo antes de entrar, con el resultado de la
 * verificación (no registrado, ya participó…) a la vista de lo que hay que corregir.
 *
 * Es un `<dialog>` modal, como el panel de detalle del admin: atrapa el foco y Escape lo
 * cierra, salvo mientras se verifica. Desde abajo en el teléfono; centrada en PC.
 */
export function IdentityDialog({
  open,
  schema,
  identity,
  onIdentityChange,
  identityErrors,
  alert,
  documentLocked,
  busy,
  submitLabel,
  onSubmit,
  onClose,
}: IdentityDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      // El foco va al primer dato por llenar y no a la «x» de cerrar, que es lo primero
      // que encontraría el navegador.
      dialog.querySelector<HTMLElement>('[data-autofocus]')?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

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

  const close = () => {
    if (!busy) onClose();
  };

  return (
    <dialog
      ref={ref}
      // Escape cierra a través del estado, no por su cuenta: así la ventana no se cierra
      // mientras se verifica el documento.
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      onClick={(event) => {
        if (event.target === ref.current) close();
      }}
      aria-labelledby="identificacion-titulo"
      aria-describedby="identificacion-nota"
      className="fixed inset-x-0 top-auto bottom-0 m-0 max-h-[92dvh] w-full max-w-none flex-col overflow-hidden rounded-t-[20px] bg-white p-0 text-foreground shadow-[0_-24px_48px_-24px_#06142b59] backdrop:bg-navy-950/45 open:flex sm:inset-0 sm:m-auto sm:h-fit sm:max-h-[calc(100dvh-4rem)] sm:w-[min(38rem,calc(100vw-2rem))] sm:rounded-2xl sm:shadow-[0_32px_64px_-32px_#06142b80]"
    >
      <div aria-hidden className="lk-accent-bar h-1.5 shrink-0" />

      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
        className="flex min-h-0 flex-1 flex-col"
      >
        <header className="flex items-start gap-3 px-5 pt-5 sm:px-7 sm:pt-6">
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground-subtle">
              Antes de empezar
            </p>
            <h2 id="identificacion-titulo" className="text-xl leading-snug text-foreground">
              Identificación
            </h2>
            <p id="identificacion-nota" className="text-sm leading-relaxed text-foreground-muted">
              La encuesta es anónima. Su número de documento solo sirve para verificar que
              cada colaborador responda una vez: no queda unido a sus respuestas.
            </p>
          </div>
          <button
            type="button"
            onClick={close}
            disabled={busy}
            aria-label="Cerrar la identificación"
            className="-mt-1 -mr-2 flex size-10 shrink-0 items-center justify-center rounded-full text-foreground-muted hover:bg-surface-muted hover:text-foreground disabled:opacity-50"
          >
            <Icon name="close" size={20} />
          </button>
        </header>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 py-5 sm:px-7">
          {alert && (
            <div
              role="alert"
              className={[
                'flex items-start gap-3 rounded-xl px-4 py-3',
                alert.tone === 'info' ? 'bg-brand-subtle text-foreground' : 'bg-danger-subtle text-danger',
              ].join(' ')}
            >
              <Icon
                name={alert.tone === 'info' ? 'check' : 'alertCircle'}
                size={20}
                className={['mt-px shrink-0', alert.tone === 'info' ? 'text-brand' : ''].join(' ')}
              />
              <div className="flex flex-col gap-0.5">
                <p className="text-sm font-semibold">{alert.title}</p>
                <p className={alert.tone === 'info' ? 'text-sm text-foreground-muted' : 'text-sm'}>
                  {alert.message}
                </p>
              </div>
            </div>
          )}

          {/*
           * Dos filas: quién es (documento y cargo) y dónde trabaja (proceso y luego
           * subproceso). `grid-cols-1` y no la columna implícita, que crecería hasta la
           * opción más larga de un selector y lo sacaría de la ventana en el teléfono.
           */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
                data-autofocus={documentLocked ? undefined : true}
                aria-invalid={identityErrors.numeroDocumento ? true : undefined}
                onChange={(event) =>
                  onIdentityChange({ ...identity, numeroDocumento: event.target.value })
                }
                className={`${FIELD_CLASS} read-only:bg-surface-sunken read-only:text-foreground-muted`}
              />
              {identityErrors.numeroDocumento && (
                <span className="text-sm text-danger">{identityErrors.numeroDocumento}</span>
              )}
            </label>

            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-foreground">Cargo</span>
              <select
                value={identity.respondentRole}
                disabled={busy}
                data-autofocus={documentLocked ? true : undefined}
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
                <span className="text-sm text-danger">{identityErrors.respondentRole}</span>
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
                <span className="text-sm text-danger">Seleccione su proceso.</span>
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
                <span className="text-sm text-danger">{identityErrors.ownArea}</span>
              )}
            </label>
          </div>
        </div>

        <footer className="flex flex-col-reverse gap-2 border-t border-border-subtle px-5 pt-3.5 pb-5 sm:flex-row sm:items-center sm:justify-end sm:px-7 sm:pb-6">
          <button
            type="button"
            onClick={close}
            disabled={busy}
            className="min-h-12 rounded-xl px-5 text-sm font-medium text-foreground-muted hover:bg-surface-muted hover:text-foreground disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={busy}
            className="lk-button inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-7 text-[15px] font-semibold"
          >
            {busy ? 'Verificando…' : submitLabel}
            {!busy && <Icon name="arrowRight" size={16} strokeWidth={2} />}
          </button>
        </footer>
      </form>
    </dialog>
  );
}
