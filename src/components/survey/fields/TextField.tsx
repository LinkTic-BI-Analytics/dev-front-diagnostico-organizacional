'use client';

import type { FieldProps } from './field.types';

export function TextField({ question, value, onChange, error, disabled }: FieldProps) {
  const text = value?.kind === 'text' ? value.value : '';
  const maxLength = question.maxLength ?? 1000;

  return (
    <div className="flex max-w-3xl flex-col gap-1.5">
      <textarea
        rows={5}
        value={text}
        maxLength={maxLength}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        onChange={(event) => onChange({ kind: 'text', value: event.target.value })}
        className="resize-y rounded-xl border border-border-strong bg-white px-4 py-3 text-sm text-foreground placeholder:text-foreground-subtle focus-visible:border-lk-blue focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-lk-blue/15"
        placeholder="Escriba su respuesta"
      />
      <div className="flex justify-between text-xs text-foreground-muted">
        <span>{question.required ? '' : 'Opcional'}</span>
        <span aria-live="polite">
          {text.length} / {maxLength}
        </span>
      </div>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
