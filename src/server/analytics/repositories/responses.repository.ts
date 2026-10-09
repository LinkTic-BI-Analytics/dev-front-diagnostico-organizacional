import { db } from '../../db';
import { GLOBAL_AREA_CODE } from '../../common/constants';
import type { AnalyticsFilters } from '../dto/analytics.dto';

/** Conteos y duraciones que alimentan las tarjetas superiores (KPIs 3, 4, 5). */
export async function fetchCompletionStats(filters: AnalyticsFilters) {
  const scope = {
    ...(filters.campaignId ? { campaignId: filters.campaignId } : {}),
    ...(filters.ownArea ? { ownArea: filters.ownArea } : {}),
    ...(filters.respondentRole
      ? { respondentRole: filters.respondentRole }
      : {}),
  };

  const [completed, started, durations] = await Promise.all([
    db().surveyResponse.count({
      where: { ...scope, status: 'COMPLETED' },
    }),
    db().surveyResponse.count({ where: scope }),
    db().surveyResponse.findMany({
      where: {
        ...scope,
        status: 'COMPLETED',
        durationSeconds: { not: null },
      },
      select: { durationSeconds: true },
    }),
  ]);

  return {
    completed,
    started,
    durations: durations
      .map((row) => row.durationSeconds)
      .filter((value): value is number => value !== null),
  };
}

/**
 * Población por área para la tasa de participación (KPI 3).
 *
 * Si ningún área tiene `headcount`, devuelve null: inventar un denominador daría una
 * tasa falsa, y es mejor que el panel muestre "sin definir".
 */
export async function fetchPopulation(ownArea?: string): Promise<number | null> {
  const areas = await db().area.findMany({
    where: {
      active: true,
      code: ownArea ? ownArea : { not: GLOBAL_AREA_CODE },
      headcount: { not: null },
    },
    select: { headcount: true },
  });

  if (areas.length === 0) return null;
  return areas.reduce((total, area) => total + (area.headcount ?? 0), 0);
}

/**
 * Áreas activas del catálogo, en su orden y sin el centinela global. Incluye las no
 * evaluables como OTRA: quien filtra por `isEvaluable` es cada consumidor. Trae su gestión
 * para que el monitoreo pueda agrupar sin otro viaje a la base.
 */
export async function fetchAreas() {
  return db().area.findMany({
    where: { active: true, code: { not: GLOBAL_AREA_CODE } },
    orderBy: { sortOrder: 'asc' },
    select: {
      code: true,
      name: true,
      isEvaluable: true,
      headcount: true,
      procesoCode: true,
      proceso: { select: { name: true } },
    },
  });
}

/**
 * Respuestas de cualquier estado para el monitoreo: aquí los borradores son el dato, no
 * ruido. Solo columnas de participación — ni respuestas ni huellas.
 *
 * Solo se honra `campaignId`. `from`/`to` cortan por `submittedAt`, que los borradores no
 * tienen, así que aplicarlos borraría justo lo que se quiere ver; frecuencia y tipo de
 * interacción dependen de lo que se respondió, y los cortes por área y por cargo ya vienen
 * en `byArea` y `byRole`.
 */
export async function fetchMonitoringRows(filters: AnalyticsFilters) {
  return db().surveyResponse.findMany({
    where: filters.campaignId ? { campaignId: filters.campaignId } : {},
    select: {
      status: true,
      ownArea: true,
      respondentRole: true,
      startedAt: true,
      submittedAt: true,
      updatedAt: true,
      durationSeconds: true,
      lastStep: true,
    },
  });
}

/** Componentes del instrumento en su orden, para el embudo del monitoreo. */
export async function fetchComponents() {
  return db().component.findMany({
    orderBy: { sortOrder: 'asc' },
    select: { id: true, title: true, sortOrder: true },
  });
}

/**
 * Las preguntas 0-10 activas, por área o globales, en el orden del instrumento: primero el
 * del componente y después el de la pregunta.
 */
export async function fetchScaleQuestions() {
  return db().question.findMany({
    where: { active: true, type: { in: ['SCALE_0_10', 'MATRIX_AREA'] } },
    orderBy: [{ component: { sortOrder: 'asc' } }, { sortOrder: 'asc' }],
    select: {
      code: true,
      label: true,
      componentId: true,
      sortOrder: true,
      component: { select: { title: true, sortOrder: true } },
    },
  });
}

/** Opciones estáticas de un conjunto de preguntas, en su orden, para las etiquetas. */
export async function fetchQuestionOptions(questionCodes: readonly string[]) {
  return db().questionOption.findMany({
    where: { questionCode: { in: [...questionCodes] } },
    orderBy: [{ questionCode: 'asc' }, { sortOrder: 'asc' }],
    select: { questionCode: true, value: true, label: true },
  });
}

/** Las opciones tipo "Otra: ____", que exigen que el encuestado escriba cuál. */
export async function fetchTextOptions() {
  return db().questionOption.findMany({
    where: { allowsText: true },
    select: { questionCode: true, value: true },
  });
}

/**
 * Áreas de origen con su conteo de respuestas, para el KPI 20.
 *
 * Este conteo decide qué filas pasan la cohorte, así que tiene que salir del mismo corte
 * que sus promedios: con el filtro por cargo, contar todas las respuestas del área dejaría
 * ver la fila de un área con un solo director bajo el respaldo de sus veinte analistas.
 */
export async function fetchRespondentsByOwnArea(filters: AnalyticsFilters) {
  const rows = await db().surveyResponse.groupBy({
    by: ['ownArea'],
    where: {
      status: 'COMPLETED',
      ...(filters.campaignId ? { campaignId: filters.campaignId } : {}),
      ...(filters.respondentRole
        ? { respondentRole: filters.respondentRole }
        : {}),
    },
    _count: { _all: true },
  });

  return rows
    .filter(
      (row): row is typeof row & { ownArea: string } => row.ownArea !== null,
    )
    .map((row) => ({ areaCode: row.ownArea, respondents: row._count._all }));
}

/** Listado paginado del panel de respuestas. */
export async function fetchPage(filters: AnalyticsFilters, page: number, pageSize: number) {
  const where = {
    status: 'COMPLETED' as const,
    ...(filters.campaignId ? { campaignId: filters.campaignId } : {}),
    ...(filters.ownArea ? { ownArea: filters.ownArea } : {}),
    ...(filters.respondentRole
      ? { respondentRole: filters.respondentRole }
      : {}),
  };

  const [total, rows] = await Promise.all([
    db().surveyResponse.count({ where }),
    db().surveyResponse.findMany({
      where,
      orderBy: { submittedAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        ownArea: true,
        ownAreaOther: true,
        respondentRole: true,
        submittedAt: true,
        durationSeconds: true,
        area: { select: { name: true } },
        _count: { select: { answers: true } },
      },
    }),
  ]);

  return { total, rows };
}

export async function fetchCampaigns() {
  return db().campaign.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      isOpen: true,
      startsAt: true,
      endsAt: true,
      _count: { select: { responses: true } },
    },
  });
}
