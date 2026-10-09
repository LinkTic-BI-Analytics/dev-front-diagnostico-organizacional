import {
  GLOBAL_AREA_CODE,
  PIVOT_QUESTION,
  type Area,
  type Question,
  type SurveyComponent,
  type SurveySchema,
} from '@/lib/survey-schema.types';

export type WizardStep =
  | { kind: 'welcome' }
  | {
      kind: 'component';
      componentId: number;
      /** Presente en los sub-pasos por área del componente 2. */
      areaCode?: string;
      areaIndex?: number;
      areaTotal?: number;
    }
  | { kind: 'review' };

/**
 * Cómo se pinta un componente. Se deduce de las preguntas, no de una lista fija de ids:
 * si LinkTIC añade otro componente que se evalúa por área, el wizard lo acomoda solo.
 */
export type ComponentLayout = 'simple' | 'matrix-per-area' | 'list-per-area';

export function layoutOf(component: SurveyComponent): ComponentLayout {
  const perArea = component.questions.filter((question) => question.perArea);
  if (perArea.length === 0) return 'simple';

  // Una batería de aspectos por área es demasiado para una pantalla (5 × 5 = 25 valores),
  // así que se pagina por área. Una sola pregunta por área cabe como lista compacta.
  return perArea.some((question) => question.type === 'MATRIX_AREA')
    ? 'matrix-per-area'
    : 'list-per-area';
}

/**
 * Construye la secuencia de pasos. El componente 2 aporta un paso por área evaluada, lo
 * que hace que el total dependa de cuántas áreas eligió el encuestado en 1.2.
 */
export function buildSteps(
  schema: SurveySchema,
  evaluableAreas: string[],
): WizardStep[] {
  const steps: WizardStep[] = [{ kind: 'welcome' }];

  for (const component of schema.components) {
    if (layoutOf(component) === 'matrix-per-area') {
      // Sin áreas todavía (el encuestado no pasó por 1.2) se deja un paso placeholder para
      // que el conteo de pasos no salte de golpe al responderlo.
      const areas = evaluableAreas.length > 0 ? evaluableAreas : [''];
      areas.forEach((areaCode, index) => {
        steps.push({
          kind: 'component',
          componentId: component.id,
          areaCode: areaCode || undefined,
          areaIndex: index + 1,
          areaTotal: areas.length,
        });
      });
    } else {
      steps.push({ kind: 'component', componentId: component.id });
    }
  }

  steps.push({ kind: 'review' });
  return steps;
}

/** Áreas que el encuestado declaró en 1.2, en el orden del catálogo. */
export function resolveEvaluableAreas(
  areas: Area[],
  selected: string[] | undefined,
): { code: string; name: string }[] {
  if (!selected?.length) return [];
  const byCode = new Map(areas.map((area) => [area.code, area.name]));

  return selected
    // 'OTRA' no identifica un área concreta, así que no se puede evaluar por separado.
    .filter((code) => code !== 'OTRA' && byCode.has(code))
    .map((code) => ({ code, name: byCode.get(code)! }));
}

/** Las preguntas de un paso, con el área objetivo que le corresponde a cada una. */
export function questionsForStep(
  component: SurveyComponent,
  step: Extract<WizardStep, { kind: 'component' }>,
  evaluableAreas: { code: string; name: string }[],
): { question: Question; targetArea: string; areaName?: string }[] {
  const layout = layoutOf(component);

  if (layout === 'matrix-per-area') {
    if (!step.areaCode) return [];
    const areaName = evaluableAreas.find((area) => area.code === step.areaCode)?.name;
    return component.questions
      .filter((question) => question.perArea)
      .map((question) => ({ question, targetArea: step.areaCode!, areaName }));
  }

  if (layout === 'list-per-area') {
    const entries: { question: Question; targetArea: string; areaName?: string }[] = [];
    for (const question of component.questions) {
      if (question.perArea) {
        for (const area of evaluableAreas) {
          entries.push({ question, targetArea: area.code, areaName: area.name });
        }
      } else {
        entries.push({ question, targetArea: GLOBAL_AREA_CODE });
      }
    }
    return entries;
  }

  return component.questions.map((question) => ({
    question,
    targetArea: GLOBAL_AREA_CODE,
  }));
}

export const PIVOT_KEY = `${PIVOT_QUESTION}__${GLOBAL_AREA_CODE}`;
