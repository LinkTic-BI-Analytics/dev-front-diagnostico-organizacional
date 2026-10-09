import type { WizardStep } from './wizard-steps';

/**
 * Los cuatro bloques en que se recorre la encuesta.
 *
 * El instrumento tiene diez componentes y ese es el orden que manda (`Contexto.md` §3).
 * Los bloques no lo alteran: lo agrupan. El corte está donde cambia el TIPO de esfuerzo
 * que se le pide al encuestado, que es justo donde conviene que cambie el color:
 *
 *   1-2   califica áreas concretas, una por una
 *   3-6   califica cómo funciona la empresa (comunicación, servicio, tiempos, roles)
 *   7-8   habla de cultura: cómo nos tratamos, aprendemos e innovamos
 *   9-10  cierra diciendo qué recomendaría y qué hay que cambiar
 *
 * Cada bloque es contiguo a propósito. Un bloque partido (cultura en el 3 y en el 7)
 * haría que el color fuera y volviera, que es exactamente la señal contraria a la que
 * sirve: el tono solo debe cambiar cuando se cambia de terreno.
 *
 * `id` es el valor de `data-phase` que activa la paleta en `globals.css`.
 */
export interface SurveyPhase {
  id: 'relacionamiento' | 'operacion' | 'cultura' | 'cierre';
  order: number;
  /** Nombre corto, el que se repite en la barra y en la cinta. */
  name: string;
  /** Qué se le pide al encuestado en este bloque, en su idioma. */
  promise: string;
  /** Por qué vale la pena terminarlo. Se muestra al entrar al bloque. */
  payoff: string;
  componentIds: number[];
}

export const SURVEY_PHASES: SurveyPhase[] = [
  {
    id: 'relacionamiento',
    order: 1,
    name: 'Relacionamiento',
    promise: 'Con quién trabaja y cómo lo califica',
    payoff: 'Es el bloque más largo, y el que construye el mapa de relacionamiento.',
    componentIds: [1, 2],
  },
  {
    id: 'operacion',
    order: 2,
    name: 'Cómo funciona la empresa',
    promise: 'Comunicación, servicio, tiempos y roles',
    payoff: 'Aquí ya no califica áreas: califica cómo funciona la operación.',
    componentIds: [3, 4, 5, 6],
  },
  {
    id: 'cultura',
    order: 3,
    name: 'Cultura',
    promise: 'Cómo nos tratamos, aprendemos e innovamos',
    payoff: 'Es el bloque más corto de todos.',
    componentIds: [7, 8],
  },
  {
    id: 'cierre',
    order: 4,
    name: 'Qué debemos cambiar',
    promise: 'Lo que recomendaría y lo que hay que arreglar',
    payoff: 'La recta final, y la parte que más se usa después.',
    componentIds: [9, 10],
  },
];

const PHASE_BY_COMPONENT = new Map<number, SurveyPhase>(
  SURVEY_PHASES.flatMap((phase) =>
    phase.componentIds.map((componentId) => [componentId, phase] as const),
  ),
);

export function phaseOfComponent(componentId: number): SurveyPhase | null {
  return PHASE_BY_COMPONENT.get(componentId) ?? null;
}

/**
 * El bloque de un paso. La bienvenida y la revisión no pertenecen a ninguno: son el
 * antes y el después del recorrido, y se pintan con el azul de marca.
 */
export function phaseOfStep(step: WizardStep | undefined): SurveyPhase | null {
  return step?.kind === 'component' ? phaseOfComponent(step.componentId) : null;
}

export interface PhaseSegment {
  phase: SurveyPhase;
  /** Pasos del wizard que caen en este bloque. Depende de cuántas áreas eligió. */
  total: number;
  done: number;
  state: 'done' | 'current' | 'pending';
  /** 0-100. Lo que se pinta relleno en el tramo. */
  percent: number;
}

/**
 * El avance tramo por tramo.
 *
 * Se cuenta sobre los pasos reales y no sobre los diez componentes porque el componente 2
 * aporta un paso por área evaluada: con cinco áreas, el primer bloque son seis pantallas
 * de dieciséis. Un tramo que ignorara eso avanzaría a saltos y mentiría justo en el punto
 * donde más gente abandona.
 */
export function phaseSegments(steps: WizardStep[], stepIndex: number): PhaseSegment[] {
  return SURVEY_PHASES.map((phase) => {
    let total = 0;
    let done = 0;
    let isCurrent = false;

    steps.forEach((step, index) => {
      if (step.kind !== 'component') return;
      if (phaseOfComponent(step.componentId)?.id !== phase.id) return;
      total += 1;
      if (index < stepIndex) done += 1;
      if (index === stepIndex) isCurrent = true;
    });

    const percent = total === 0 ? 0 : Math.round((done / total) * 100);
    const state: PhaseSegment['state'] = isCurrent
      ? 'current'
      : done > 0 && done === total
        ? 'done'
        : 'pending';

    return { phase, total, done, state, percent };
  });
}

/** Posición del paso dentro de su bloque, 1-based. `null` fuera de un bloque. */
export function positionInPhase(
  steps: WizardStep[],
  stepIndex: number,
): { position: number; total: number } | null {
  const phase = phaseOfStep(steps[stepIndex]);
  if (!phase) return null;

  let position = 0;
  let total = 0;
  steps.forEach((step, index) => {
    if (step.kind !== 'component') return;
    if (phaseOfComponent(step.componentId)?.id !== phase.id) return;
    total += 1;
    if (index <= stepIndex) position += 1;
  });

  return { position, total };
}
