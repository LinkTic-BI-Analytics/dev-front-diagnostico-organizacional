'use client';

interface AreaProgressProps {
  areaName: string;
  index: number;
  total: number;
}

/**
 * El sub-avance del componente 2, que es el único que se repite por área.
 *
 * Con cinco áreas son cinco pantallas casi idénticas, y ahí es donde la encuesta se siente
 * más larga de lo que es: sin esta pieza el encuestado no sabe si va por la segunda o por
 * la cuarta. Los puntos dicen cuántas faltan sin obligar a leer.
 */
export function AreaProgress({ areaName, index, total }: AreaProgressProps) {
  return (
    <div className="flex flex-col gap-2.5 rounded-xl border border-phase-border bg-phase-subtle px-4 py-3">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[13px] text-foreground-muted">
          Está calificando a <strong className="font-bold text-phase">{areaName}</strong>
        </p>
        <p className="shrink-0 text-xs font-semibold text-phase">
          Área {index} de {total}
        </p>
      </div>

      <ol className="flex items-center gap-1.5" aria-hidden="true">
        {Array.from({ length: total }, (_, position) => {
          const step = position + 1;
          return (
            <li
              key={step}
              className={[
                'size-2.5 rounded-full',
                step < index
                  ? 'bg-phase'
                  : step === index
                    ? 'bg-phase ring-3 ring-phase-border'
                    : 'bg-border-strong/50',
              ].join(' ')}
            />
          );
        })}
      </ol>

      {index < total && (
        <p className="text-xs text-foreground-muted">
          {total - index === 1
            ? 'Falta un área y termina el bloque más largo de la encuesta.'
            : `Faltan ${total - index} áreas y termina el bloque más largo de la encuesta.`}
        </p>
      )}
    </div>
  );
}
