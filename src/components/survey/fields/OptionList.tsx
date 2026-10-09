'use client';

import type { ReactNode } from 'react';
import type { QuestionOption } from '@/lib/survey-schema.types';
import { optionColumns, type OptionGroup } from './option-groups';

interface OptionListProps {
  groups: OptionGroup[];
  showHeadings: boolean;
  /** Pinta UNA opción. La lista solo decide dónde cae, no qué aspecto tiene. */
  children: (option: QuestionOption) => ReactNode;
}

/**
 * La lista de opciones, repartida en columnas cuando hay pantalla para ello.
 *
 * Es el reparto compartido por la selección única y la múltiple, que antes lo tenían
 * duplicado. Lo que se reparte depende de si la lista lleva encabezados: con ellos son los
 * grupos —así una gestión no queda partida entre dos columnas, que era justo la pista que
 * el encuestado usa para ubicarse—, y sin ellos las opciones sueltas.
 *
 * Dentro de las columnas la separación va por margen y no por `gap`: `columns` no crea un
 * contexto flex, así que el `gap` no separaría nada.
 */
export function OptionList({ groups, showHeadings, children }: OptionListProps) {
  const total = groups.reduce((sum, group) => sum + group.options.length, 0);
  const columns = optionColumns(total);

  if (showHeadings) {
    return (
      <div className={columns ? `${columns} gap-x-5` : 'flex flex-col gap-4'}>
        {groups.map((group, index) => (
          <div
            key={group.code ?? `sueltas-${index}`}
            className={
              columns
                ? 'mb-4 flex break-inside-avoid flex-col gap-2 last:mb-0'
                : 'flex flex-col gap-2'
            }
          >
            {group.label && (
              <p className="text-xs font-medium uppercase tracking-wide text-foreground-muted">
                {group.label}
              </p>
            )}
            {group.options.map(children)}
          </div>
        ))}
      </div>
    );
  }

  // Sin encabezados los grupos son un detalle del catálogo que aquí no se ve: se aplanan y
  // lo que se reparte son las opciones.
  const options = groups.flatMap((group) => group.options);

  return (
    <div className={columns ? `${columns} gap-x-5` : 'flex flex-col gap-2'}>
      {options.map((option) =>
        columns ? (
          <div key={option.value} className="mb-2 break-inside-avoid last:mb-0">
            {children(option)}
          </div>
        ) : (
          children(option)
        ),
      )}
    </div>
  );
}
