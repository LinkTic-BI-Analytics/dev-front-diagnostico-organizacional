'use client';

import { useId } from 'react';
import { fieldId, type FieldProps } from './field.types';

const VALUES = Array.from({ length: 11 }, (_, index) => index);

/** Anclas del PDF, solo para un back que todavía no envía las de cada pregunta. */
const FALLBACK_MIN_LABEL = 'Muy deficiente';
const FALLBACK_MAX_LABEL = 'Excelente';

/**
 * Escala 0-10 como botones segmentados.
 *
 * No es un slider ni un `<select>`: en móvil un slider hace que dar exactamente un 7 sea
 * un ejercicio de puntería, y un select esconde la escala tras un toque. Los botones dejan
 * las once opciones a la vista y son un objetivo táctil grande.
 *
 * El grupo es un `radiogroup` real, así que las flechas del teclado lo recorren y un lector
 * de pantalla anuncia "3 de 11". Las anclas quedan visibles porque sin ellas el número
 * pierde significado, y vienen del catálogo porque cada pregunta mide algo distinto: el 10
 * de "Cumplen los compromisos" es "Siempre cumplen", no "excelente".
 */
export function ScaleField({
  question,
  value,
  onChange,
  areaContext,
  error,
  disabled,
  compact,
}: FieldProps) {
  const groupId = useId();
  const selected = value?.kind === 'number' ? value.value : null;
  const describedBy = [`${groupId}-anchors`, error && `${groupId}-error`]
    .filter(Boolean)
    .join(' ');
  const minLabel = question.scaleMinLabel ?? FALLBACK_MIN_LABEL;
  const maxLabel = question.scaleMaxLabel ?? FALLBACK_MAX_LABEL;

  return (
    /*
     * Acotada aunque la columna sea ancha: estirada a mil píxeles cada número se convierte
     * en un botón de ochenta de ancho por veinte de alto, y la escala deja de leerse como
     * una regla graduada.
     */
    <div className={compact ? 'flex flex-col gap-1.5' : 'flex max-w-2xl flex-col gap-2'}>
      <div
        role="radiogroup"
        aria-labelledby={`${groupId}-label`}
        aria-describedby={describedBy}
        aria-invalid={error ? true : undefined}
        className="grid grid-cols-6 gap-1.5 sm:grid-cols-11"
      >
        {VALUES.map((option) => {
          const isSelected = selected === option;
          return (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={`${option} de 10`}
              disabled={disabled}
              onClick={() => onChange({ kind: 'number', value: option })}
              id={`${fieldId(question, areaContext?.code)}-${option}`}
              className={[
                'min-h-11 rounded-lg border text-sm font-semibold tabular-nums transition-[background-color,border-color,transform]',
                'disabled:cursor-not-allowed disabled:opacity-50',
                isSelected
                  ? 'scale-105 border-phase bg-phase text-phase-on shadow-[0_6px_16px_-8px_var(--phase-ink)]'
                  : 'border-border-subtle bg-white text-foreground hover:border-phase hover:bg-phase-subtle',
              ].join(' ')}
            >
              {option}
            </button>
          );
        })}
      </div>

      {/*
       * Las anclas son frases cortas, pero en un teléfono angosto pueden partirse: cada una
       * se queda pegada a su extremo de la regla y el hueco del medio evita que se toquen.
       */}
      <div
        id={`${groupId}-anchors`}
        className="flex justify-between gap-6 text-xs text-foreground-muted"
      >
        <span>0 · {minLabel}</span>
        <span className="text-right">10 · {maxLabel}</span>
      </div>

      {error && (
        <p id={`${groupId}-error`} role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
