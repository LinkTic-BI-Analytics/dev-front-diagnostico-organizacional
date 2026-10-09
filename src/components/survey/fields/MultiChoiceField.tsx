'use client';

import type { QuestionOption } from '@/lib/survey-schema.types';
import type { FieldProps } from './field.types';
import { OptionList } from './OptionList';
import { groupOptions, hasVisibleGroups } from './option-groups';

export function MultiChoiceField({
  question,
  value,
  onChange,
  error,
  disabled,
  primary,
}: FieldProps) {
  const selected = value?.kind === 'options' ? value.values : [];
  const otherText = value?.kind === 'options' ? (value.otherText ?? '') : '';

  const exclusiveValues = question.options
    .filter((option) => option.exclusive)
    .map((option) => option.value);

  const atLimit =
    question.maxSelect != null && selected.length >= question.maxSelect;

  function toggle(optionValue: string) {
    const isExclusive = exclusiveValues.includes(optionValue);
    const alreadySelected = selected.includes(optionValue);

    let next: string[];
    if (alreadySelected) {
      next = selected.filter((entry) => entry !== optionValue);
    } else if (isExclusive) {
      // Marcar la excluyente (p. ej. "Ninguna") reemplaza toda la selección: dejarla
      // conviviendo con otras produciría una respuesta contradictoria.
      next = [optionValue];
    } else {
      next = [...selected.filter((entry) => !exclusiveValues.includes(entry)), optionValue];
    }

    const stillNeedsText = question.options.some(
      (option) => option.allowsText && next.includes(option.value),
    );
    onChange({
      kind: 'options',
      values: next,
      otherText: stillNeedsText ? otherText : undefined,
    });

    // Desmarcar la que estaba señalada como principal deja la marca sin respaldo: se
    // limpia aquí y no en el servidor, para que el encuestado lo vea al instante.
    if (primary && alreadySelected && primary.value === optionValue) {
      primary.onChange(null);
    }
  }

  const textOption = question.options.find(
    (option) => option.allowsText && selected.includes(option.value),
  );

  const groups = groupOptions(question.options);
  const showHeadings = hasVisibleGroups(groups);

  const renderOption = (option: QuestionOption) => {
    const isSelected = selected.includes(option.value);
    // Al llegar al tope solo se pueden desmarcar opciones, no añadir más.
    const isBlocked = !isSelected && atLimit && !exclusiveValues.includes(option.value);
    const isPrimary = primary?.value === option.value;

    return (
      <div key={option.value} className="flex items-stretch gap-2">
        <button
          type="button"
          role="checkbox"
          aria-checked={isSelected}
          disabled={disabled || isBlocked}
          onClick={() => toggle(option.value)}
          className={[
            'flex flex-1 min-h-12 items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-colors',
            'disabled:cursor-not-allowed disabled:opacity-40',
            isSelected
              ? 'border-phase bg-phase-subtle text-foreground'
              : 'border-border-subtle bg-white text-foreground hover:border-phase hover:bg-phase-subtle/40',
          ].join(' ')}
        >
          <span
            aria-hidden
            className={[
              'flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 text-phase-on',
              isSelected ? 'border-phase bg-phase' : 'border-border-strong',
            ].join(' ')}
          >
            {isSelected && (
              <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none" aria-hidden>
                <path
                  d="M2.5 6.2 4.8 8.5 9.5 3.8"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </span>
          {option.label}
        </button>

        {primary && isSelected && (
          <button
            type="button"
            aria-pressed={isPrimary}
            disabled={disabled}
            onClick={() => primary.onChange(isPrimary ? null : option.value)}
            title={primary.label}
            className={[
              'flex shrink-0 items-center gap-1.5 rounded-xl border px-3 text-xs font-medium transition-colors',
              'disabled:cursor-not-allowed disabled:opacity-50',
              isPrimary
                ? 'border-phase bg-phase text-phase-on'
                : 'border-border-subtle bg-surface text-foreground-muted hover:border-phase hover:text-phase',
            ].join(' ')}
          >
            <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" aria-hidden>
              <path
                d="M10 2.5 12.2 7l5 .7-3.6 3.5.9 5-4.5-2.4L5.5 16.2l.9-5L2.8 7.7l5-.7z"
                fill={isPrimary ? 'currentColor' : 'none'}
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinejoin="round"
              />
            </svg>
            {/* En cuanto la lista se parte en tres queda solo la estrella: el rótulo se
                comería el ancho de la etiqueta del área, que es lo que hay que leer. La
                columna no se ensancha más allá de ahí, así que tampoco vuelve en xl. */}
            <span className="hidden sm:max-lg:inline">
              {isPrimary ? 'Principal' : 'Marcar'}
            </span>
            <span className="sr-only">
              {isPrimary
                ? `${option.label} está marcada como su relación principal`
                : `Marcar ${option.label} como su relación principal`}
            </span>
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-2">
      <div aria-invalid={error ? true : undefined}>
        <OptionList groups={groups} showHeadings={showHeadings}>
          {renderOption}
        </OptionList>
      </div>

      {question.maxSelect != null && (
        <p className="text-xs text-foreground-muted" aria-live="polite">
          {selected.length} de {question.maxSelect} seleccionadas
        </p>
      )}

      {primary && (
        <p
          className={primary.error ? 'text-sm text-danger' : 'text-xs text-foreground-muted'}
          role={primary.error ? 'alert' : undefined}
        >
          {primary.error ?? primary.label}
        </p>
      )}

      {textOption && (
        <input
          type="text"
          value={otherText}
          maxLength={200}
          disabled={disabled}
          placeholder="Indique cuál"
          aria-label={`Especifique: ${textOption.label}`}
          onChange={(event) =>
            onChange({ kind: 'options', values: selected, otherText: event.target.value })
          }
          className="min-h-11 max-w-md rounded-xl border border-border-strong bg-white px-4 text-sm text-foreground placeholder:text-foreground-subtle focus-visible:border-lk-blue focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-lk-blue/15"
        />
      )}

      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
