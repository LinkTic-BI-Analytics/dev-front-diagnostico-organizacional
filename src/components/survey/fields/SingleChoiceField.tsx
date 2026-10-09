'use client';

import { useId } from 'react';
import type { QuestionOption } from '@/lib/survey-schema.types';
import type { FieldProps } from './field.types';
import { OptionList } from './OptionList';
import { groupOptions, hasVisibleGroups } from './option-groups';

export function SingleChoiceField({
  question,
  value,
  onChange,
  error,
  disabled,
}: FieldProps) {
  const groupId = useId();
  const selected = value?.kind === 'option' ? value.value : null;
  const otherText = value?.kind === 'option' ? (value.otherText ?? '') : '';
  const selectedOption = question.options.find((option) => option.value === selected);
  const groups = groupOptions(question.options);
  const showHeadings = hasVisibleGroups(groups);

  const renderOption = (option: QuestionOption) => {
    const isSelected = selected === option.value;
    return (
      <button
        key={option.value}
        type="button"
        role="radio"
        aria-checked={isSelected}
        disabled={disabled}
        onClick={() =>
          onChange({
            kind: 'option',
            value: option.value,
            // Cambiar de opción descarta el texto de "Otra": conservarlo dejaría un
            // valor colgado que el servidor rechazaría al guardar.
            otherText: option.allowsText ? otherText : undefined,
          })
        }
        className={[
          'flex w-full min-h-12 items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-colors',
          'disabled:cursor-not-allowed disabled:opacity-50',
          isSelected
            ? 'border-phase bg-phase-subtle text-foreground'
            : 'border-border-subtle bg-white text-foreground hover:border-phase hover:bg-phase-subtle/40',
        ].join(' ')}
      >
        <span
          aria-hidden
          className={[
            'flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2',
            isSelected ? 'border-phase' : 'border-border-strong',
          ].join(' ')}
        >
          {isSelected && <span className="h-2 w-2 rounded-full bg-phase" />}
        </span>
        {option.label}
      </button>
    );
  };

  return (
    <div className="flex flex-col gap-2">
      <div
        role="radiogroup"
        aria-labelledby={`${groupId}-label`}
        aria-invalid={error ? true : undefined}
      >
        <OptionList groups={groups} showHeadings={showHeadings}>
          {renderOption}
        </OptionList>
      </div>

      {selectedOption?.allowsText && (
        <input
          type="text"
          value={otherText}
          maxLength={200}
          disabled={disabled}
          placeholder="Indique cuál"
          aria-label={`Especifique: ${selectedOption.label}`}
          onChange={(event) =>
            onChange({
              kind: 'option',
              value: selectedOption.value,
              otherText: event.target.value,
            })
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
