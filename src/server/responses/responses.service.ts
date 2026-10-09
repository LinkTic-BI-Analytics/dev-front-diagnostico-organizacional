import { db } from '../db';
import { serverEnv } from '../env';
import { HttpError } from '../http';
import { GLOBAL_AREA_CODE, OTHER_TEXT_MAX_LENGTH } from '../common/constants';
import { generateDraftToken, hashWithSalt } from '../common/utils/hash.util';
import { sanitizeText } from '../common/utils/sanitize.util';
import {
  PIVOT_QUESTION,
  getQuestionIndex,
  maxAreasOf,
} from '../survey/survey.service';
import { findMissingAnswers } from './rules/completeness.rule';
import { runRules } from './rules';
import type { CatalogQuestion, IncomingAnswer } from './rules';
import type { SaveStepInput } from './save-step.schema';

export interface RequestFingerprint {
  ip?: string;
  userAgent?: string;
}

/** Abre un borrador contra la campaña activa y devuelve el token para retomarlo. */
export async function startResponse(fingerprint: RequestFingerprint) {
  const prisma = db();
  const campaign = await prisma.campaign.findFirst({
    where: { isOpen: true },
    orderBy: { createdAt: 'desc' },
  });
  if (!campaign) {
    throw new HttpError(409, 'No hay una campaña de diagnóstico abierta.');
  }

  const salt = serverEnv.hashSalt;
  const response = await prisma.surveyResponse.create({
    data: {
      campaignId: campaign.id,
      draftToken: generateDraftToken(),
      ipHash: fingerprint.ip ? hashWithSalt(fingerprint.ip, salt) : null,
      userAgentHash: fingerprint.userAgent
        ? hashWithSalt(fingerprint.userAgent, salt)
        : null,
    },
    select: { id: true, draftToken: true, startedAt: true },
  });

  return {
    responseId: response.id,
    draftToken: response.draftToken,
    startedAt: response.startedAt,
  };
}

/** Recupera un borrador para continuar donde se quedó. */
export async function getDraft(draftToken: string) {
  const response = await findDraft(draftToken);

  return {
    responseId: response.id,
    status: response.status,
    lastStep: response.lastStep,
    ownArea: response.ownArea,
    respondentRole: response.respondentRole,
    answers: response.answers.map((answer) => ({
      questionCode: answer.questionCode,
      targetArea: answer.targetArea,
      valueNumber:
        answer.valueNumber == null ? null : Number(answer.valueNumber),
      valueOption: answer.valueOption,
      valueOptions: answer.valueOptions,
      valueText: answer.valueText,
    })),
  };
}

/**
 * Guarda las respuestas de un componente. Es idempotente: reenviar el mismo paso sobrescribe
 * en vez de duplicar, para que un reintento por red inestable no rompa nada.
 */
export async function saveStep(
  draftToken: string,
  componentId: number,
  input: SaveStepInput,
) {
  const response = await findDraft(draftToken);
  if (response.status === 'COMPLETED') {
    throw new HttpError(
      409,
      'Esta encuesta ya fue enviada y no admite cambios.',
    );
  }
  await assertCampaignOpen(response.campaignId);

  const questions = await getQuestionIndex();
  const component = await db().component.findUnique({
    where: { id: componentId },
  });
  if (!component) {
    throw new HttpError(404, `El componente ${componentId} no existe.`);
  }

  // Solo se aceptan preguntas del componente que se está guardando: evita que un cliente
  // escriba en otros pasos por la puerta de atrás.
  const foreign = input.answers.filter((answer) => {
    const question = questions.get(answer.questionCode);
    return !question || question.componentId !== componentId;
  });
  if (foreign.length > 0) {
    throw new HttpError(400, {
      message: `Estas preguntas no pertenecen al componente ${componentId}.`,
      questionCodes: foreign.map((answer) => answer.questionCode),
    });
  }

  const incoming: IncomingAnswer[] = input.answers.map((answer) => ({
    questionCode: answer.questionCode,
    targetArea: answer.targetArea ?? GLOBAL_AREA_CODE,
    valueNumber: answer.valueNumber ?? null,
    valueOption: answer.valueOption ?? null,
    valueOptions: answer.valueOptions ?? [],
    valueText: answer.valueText ?? null,
  }));

  if (input.ownArea !== undefined) await assertOwnArea(input.ownArea);

  // El área propia ya no es una respuesta del componente 1: se captura en la identificación
  // y viaja con cada paso, así que se lee del paso entrante o de lo que ya quedó guardado.
  const ownArea = input.ownArea ?? response.ownArea;
  const evaluableAreas = await resolveEvaluableAreas(response.id, incoming);

  const violations = runRules({
    questions,
    answers: incoming,
    ownArea,
    evaluableAreas,
    maxAreasInteraccion: maxAreasOf(questions),
  });
  if (violations.length > 0) {
    throw new HttpError(422, {
      message: 'Hay respuestas que no cumplen las reglas del instrumento.',
      violations,
    });
  }

  await persistStep(response.id, componentId, incoming, questions, input);

  return { saved: incoming.length, componentId };
}

/** Valida completitud y cierra la encuesta. */
export async function submitResponse(draftToken: string) {
  const response = await findDraft(draftToken);
  if (response.status === 'COMPLETED') {
    return {
      status: 'COMPLETED' as const,
      submittedAt: response.submittedAt,
      alreadySubmitted: true,
    };
  }
  await assertCampaignOpen(response.campaignId);

  const questions = await db().question.findMany({
    where: { active: true },
    include: { options: true },
  });
  const stored: IncomingAnswer[] = response.answers.map((answer) => ({
    questionCode: answer.questionCode,
    targetArea: answer.targetArea,
    valueNumber: answer.valueNumber == null ? null : Number(answer.valueNumber),
    valueOption: answer.valueOption,
    valueOptions: answer.valueOptions,
    valueText: answer.valueText,
  }));

  const evaluableAreas = await resolveEvaluableAreas(response.id, []);
  const missing = findMissingAnswers(questions, stored, evaluableAreas);
  if (missing.length > 0) {
    throw new HttpError(422, {
      message: 'Faltan respuestas obligatorias.',
      missing,
    });
  }

  // El área y el cargo son obligatorios: sin área no hay fila en el mapa de relacionamiento,
  // y sin cargo no hay corte por nivel. El componente 0 es la identificación, que el front
  // resuelve llevando al paso de bienvenida.
  const identityMissing = [
    ...(response.ownArea ? [] : ['ownArea']),
    ...(response.respondentRole ? [] : ['respondentRole']),
  ];
  if (identityMissing.length > 0) {
    throw new HttpError(422, {
      message: 'Falta la identificación: indique su área y su cargo.',
      missing: identityMissing.map((questionCode) => ({
        questionCode,
        componentId: 0,
      })),
    });
  }

  const submittedAt = new Date();
  const durationSeconds = Math.max(
    0,
    Math.round((submittedAt.getTime() - response.startedAt.getTime()) / 1000),
  );

  await db().surveyResponse.update({
    where: { id: response.id },
    data: { status: 'COMPLETED', submittedAt, durationSeconds },
  });

  return {
    status: 'COMPLETED' as const,
    submittedAt,
    alreadySubmitted: false,
  };
}

// ---------- internos ----------

async function findDraft(draftToken: string) {
  const response = await db().surveyResponse.findUnique({
    where: { draftToken },
    include: { answers: true },
  });
  if (!response) {
    throw new HttpError(
      404,
      'No encontramos esta encuesta. Verifique el enlace.',
    );
  }
  return response;
}

async function assertCampaignOpen(campaignId: string) {
  const campaign = await db().campaign.findUnique({
    where: { id: campaignId },
  });
  if (!campaign?.isOpen) {
    throw new HttpError(409, 'La campaña de diagnóstico está cerrada.');
  }
}

/** El área propia tiene que ser un subproceso vigente del organigrama. */
async function assertOwnArea(code: string) {
  const area = await db().area.findFirst({
    where: { code, active: true, isEvaluable: true },
    select: { code: true },
  });
  if (!area) {
    throw new HttpError(400, {
      message: 'El área indicada no está en el catálogo del instrumento.',
      ownArea: code,
    });
  }
}

/**
 * Las áreas evaluables son las de 1.2, la pregunta pivote. Se leen del paso entrante si
 * viene, o de lo ya guardado, porque C2 y C9 se validan contra ellas en pasos posteriores.
 */
async function resolveEvaluableAreas(
  responseId: string,
  incoming: IncomingAnswer[],
): Promise<string[]> {
  const fromIncoming = incoming.find((a) => a.questionCode === PIVOT_QUESTION);
  if (fromIncoming) return fromIncoming.valueOptions ?? [];

  const stored = await db().answer.findUnique({
    where: {
      responseId_questionCode_targetArea: {
        responseId,
        questionCode: PIVOT_QUESTION,
        targetArea: GLOBAL_AREA_CODE,
      },
    },
    select: { valueOptions: true },
  });
  return stored?.valueOptions ?? [];
}

async function persistStep(
  responseId: string,
  componentId: number,
  incoming: IncomingAnswer[],
  questions: Map<string, CatalogQuestion>,
  input: SaveStepInput,
) {
  await db().$transaction(async (tx) => {
    for (const answer of incoming) {
      const question = questions.get(answer.questionCode)!;
      const maxLength =
        question.type === 'TEXT'
          ? (question.maxLength ?? 1000)
          : OTHER_TEXT_MAX_LENGTH;

      const data = {
        valueNumber: answer.valueNumber,
        valueOption: answer.valueOption,
        valueOptions: answer.valueOptions ?? [],
        valueText: sanitizeText(answer.valueText, maxLength),
      };

      await tx.answer.upsert({
        where: {
          responseId_questionCode_targetArea: {
            responseId,
            questionCode: answer.questionCode,
            targetArea: answer.targetArea ?? GLOBAL_AREA_CODE,
          },
        },
        update: data,
        create: {
          responseId,
          questionCode: answer.questionCode,
          targetArea: answer.targetArea ?? GLOBAL_AREA_CODE,
          ...data,
        },
      });
    }

    // Si el encuestado reduce las áreas de 1.2, las calificaciones por área que ya no
    // aplican deben desaparecer; si no, quedarían huérfanas inflando los promedios.
    const pivot = incoming.find((a) => a.questionCode === PIVOT_QUESTION);
    if (pivot) {
      const keep = pivot.valueOptions ?? [];
      await tx.answer.deleteMany({
        where: {
          responseId,
          question: { perArea: true },
          targetArea: { notIn: [...keep, GLOBAL_AREA_CODE] },
        },
      });
    }

    await tx.surveyResponse.update({
      where: { id: responseId },
      data: {
        lastStep: componentId,
        ...(input.ownArea !== undefined ? { ownArea: input.ownArea } : {}),
        ...(input.respondentRole !== undefined
          ? { respondentRole: input.respondentRole }
          : {}),
      },
    });
  });
}
