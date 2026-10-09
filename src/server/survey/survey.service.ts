import { db } from '../db';
import { HttpError } from '../http';
import { GLOBAL_AREA_CODE, RESPONDENT_ROLES } from '../common/constants';
import type { OptionSource } from '../generated/prisma/enums';
import type {
  AreaDto,
  ComponentDto,
  ProcesoDto,
  QuestionDto,
  QuestionOptionDto,
  SurveySchemaDto,
} from './dto/survey-schema.dto';

/** La pregunta 1.2: las áreas con las que interactúa el encuestado. */
export const PIVOT_QUESTION = 'c1_areas_interaccion';

/** Tope de áreas de 1.2 si el catálogo no lo declarara. Hoy lo declara: `maxSelect: 5`. */
const DEFAULT_MAX_AREAS = 5;

/**
 * Devuelve el instrumento completo: campaña activa, catálogo de áreas y los 10 componentes
 * con sus preguntas y opciones ya resueltas.
 *
 * Las opciones de las preguntas marcadas como "(Lista)" en el PDF se resuelven aquí desde el
 * catálogo vivo (áreas/procesos), así que dar de alta un área no obliga a editar preguntas.
 */
export async function getSchema(): Promise<SurveySchemaDto> {
  const prisma = db();
  const [campaign, areas, procesos, components] = await Promise.all([
    prisma.campaign.findFirst({
      where: { isOpen: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.area.findMany({
      where: { active: true },
      orderBy: { sortOrder: 'asc' },
    }),
    prisma.proceso.findMany({
      where: { active: true },
      orderBy: { sortOrder: 'asc' },
    }),
    prisma.component.findMany({
      orderBy: { sortOrder: 'asc' },
      include: {
        questions: {
          where: { active: true },
          orderBy: { sortOrder: 'asc' },
          include: { options: { orderBy: { sortOrder: 'asc' } } },
        },
      },
    }),
  ]);

  if (!campaign) {
    throw new HttpError(
      404,
      'No hay una campaña de diagnóstico abierta en este momento.',
    );
  }

  // El nombre de la gestión viaja pegado a cada subproceso: así el front agrupa la lista
  // sin tener que cruzarla contra el catálogo de procesos por su cuenta.
  const procesoNames = new Map(
    procesos.map((proceso) => [proceso.code, proceso.name]),
  );

  const areaOptions: QuestionOptionDto[] = areas
    .filter((area) => area.code !== GLOBAL_AREA_CODE && area.isEvaluable)
    .map((area) => ({
      value: area.code,
      label: area.name,
      allowsText: false,
      exclusive: false,
      group:
        area.procesoCode && procesoNames.has(area.procesoCode)
          ? {
              code: area.procesoCode,
              label: procesoNames.get(area.procesoCode)!,
            }
          : null,
    }));

  const procesoOptions: QuestionOptionDto[] = procesos.map((proceso) => ({
    value: proceso.code,
    label: proceso.name,
    allowsText: false,
    exclusive: false,
    group: null,
  }));

  const mapped: ComponentDto[] = components.map((component) => ({
    id: component.id,
    code: component.code,
    title: component.title,
    intro: component.intro,
    questions: component.questions.map((question): QuestionDto => {
      const staticOptions: QuestionOptionDto[] = question.options.map(
        (option) => ({
          value: option.value,
          label: option.label,
          allowsText: option.allowsText,
          exclusive: option.exclusive,
          group: null,
        }),
      );

      const catalogOptions =
        question.optionSource === 'AREAS'
          ? areaOptions
          : question.optionSource === 'PROCESOS'
            ? procesoOptions
            : [];

      return {
        code: question.code,
        componentId: question.componentId,
        label: question.label,
        helpText: question.helpText,
        scaleMinLabel: question.scaleMinLabel,
        scaleMaxLabel: question.scaleMaxLabel,
        type: question.type,
        required: question.required,
        minSelect: question.minSelect,
        maxSelect: question.maxSelect,
        perArea: question.perArea,
        maxLength: question.maxLength,
        options: [...catalogOptions, ...staticOptions],
      };
    }),
  }));

  const publicAreas: AreaDto[] = areas
    .filter((area) => area.code !== GLOBAL_AREA_CODE)
    .map((area) => ({
      code: area.code,
      name: area.name,
      isEvaluable: area.isEvaluable,
      procesoCode: area.procesoCode,
    }));

  const publicProcesos: ProcesoDto[] = procesos.map((proceso) => ({
    code: proceso.code,
    name: proceso.name,
  }));

  const pivot = components
    .flatMap((component) => component.questions)
    .find((question) => question.code === PIVOT_QUESTION);

  return {
    campaign: {
      id: campaign.id,
      name: campaign.name,
      isOpen: campaign.isOpen,
    },
    areas: publicAreas,
    procesos: publicProcesos,
    roles: RESPONDENT_ROLES.map((role) => ({
      value: role.value,
      label: role.label,
    })),
    components: mapped,
    settings: {
      // El tope real de 1.2 es el `maxSelect` del catálogo, que es lo que valida
      // `multi-select-bounds.rule.ts`. Antes venía de una variable de entorno que nadie
      // aplicaba y que llegaba como texto ("5"); ahora dice lo que de verdad se exige.
      maxAreasInteraccion: pivot?.maxSelect ?? DEFAULT_MAX_AREAS,
    },
  };
}

/**
 * Catálogo indexado por código, para que el motor de reglas valide sin re-consultar.
 *
 * Las opciones llegan RESUELTAS, igual que en `getSchema`: una pregunta con
 * `optionSource = AREAS` saca sus opciones de la tabla `areas`, no de `question_options`.
 * Si aquí se devolvieran solo las estáticas, el motor rechazaría todo valor legítimo del
 * catálogo — el encuestado vería opciones que el servidor no acepta.
 */
export async function getQuestionIndex() {
  const [questions, catalog] = await Promise.all([
    db().question.findMany({
      where: { active: true },
      include: { options: true },
    }),
    loadCatalogOptions(),
  ]);

  return new Map(
    questions.map((question) => [
      question.code,
      {
        ...question,
        options: [
          ...catalogOptionsFor(question.optionSource, catalog).map(
            (option, index) => ({
              id: BigInt(-(index + 1)),
              questionCode: question.code,
              value: option.value,
              label: option.label,
              allowsText: false,
              exclusive: false,
              sortOrder: index + 1,
            }),
          ),
          ...question.options,
        ],
      },
    ]),
  );
}

/** El tope de áreas de la pregunta pivote, leído del mismo índice que usa el motor. */
export function maxAreasOf(
  questions: Awaited<ReturnType<typeof getQuestionIndex>>,
): number {
  return questions.get(PIVOT_QUESTION)?.maxSelect ?? DEFAULT_MAX_AREAS;
}

type CatalogOptions = Record<
  'AREAS' | 'PROCESOS',
  { value: string; label: string }[]
>;

/** Opciones que provienen de un catálogo vivo (áreas, procesos). */
async function loadCatalogOptions(): Promise<CatalogOptions> {
  const prisma = db();
  const [areas, procesos] = await Promise.all([
    prisma.area.findMany({
      where: {
        active: true,
        isEvaluable: true,
        code: { not: GLOBAL_AREA_CODE },
      },
      orderBy: { sortOrder: 'asc' },
      select: { code: true, name: true },
    }),
    prisma.proceso.findMany({
      where: { active: true },
      orderBy: { sortOrder: 'asc' },
      select: { code: true, name: true },
    }),
  ]);

  return {
    AREAS: areas.map((area) => ({ value: area.code, label: area.name })),
    PROCESOS: procesos.map((proceso) => ({
      value: proceso.code,
      label: proceso.name,
    })),
  };
}

function catalogOptionsFor(source: OptionSource, catalog: CatalogOptions) {
  if (source === 'AREAS') return catalog.AREAS;
  if (source === 'PROCESOS') return catalog.PROCESOS;
  return [];
}
