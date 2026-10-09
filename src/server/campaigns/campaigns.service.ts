import { z } from 'zod';
import { db } from '../db';
import { HttpError } from '../http';
import { isoDateString } from '../analytics/dto/analytics-filters.schema';

export const createCampaignSchema = z
  .object({
    name: z.string().min(3).max(120),
    endsAt: isoDateString.optional(),
    /** Al abrirla se cierra la anterior: solo puede haber una campaña recibiendo respuestas. */
    open: z.boolean().optional(),
  })
  .strict();

export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;

export async function listCampaigns() {
  const prisma = db();
  const campaigns = await prisma.campaign.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      isOpen: true,
      startsAt: true,
      endsAt: true,
      createdAt: true,
    },
  });

  // Solo se cuentan las completadas: los borradores no son resultados del diagnóstico.
  const counts = await prisma.surveyResponse.groupBy({
    by: ['campaignId'],
    where: { status: 'COMPLETED' },
    _count: { _all: true },
  });
  const byCampaign = new Map(
    counts.map((row) => [row.campaignId, row._count._all]),
  );

  return campaigns.map((campaign) => ({
    ...campaign,
    completedResponses: byCampaign.get(campaign.id) ?? 0,
  }));
}

/**
 * Crea una campaña. Si nace abierta, cierra las demás en la misma transacción.
 *
 * `GET /survey/schema` sirve la campaña abierta más reciente, así que dos abiertas a la vez
 * repartirían las respuestas de un mismo corte entre dos campañas sin que nadie lo note.
 */
export async function createCampaign(input: CreateCampaignInput) {
  const open = input.open ?? true;

  return db().$transaction(async (tx) => {
    if (open) {
      await tx.campaign.updateMany({
        where: { isOpen: true },
        data: { isOpen: false, endsAt: new Date() },
      });
    }

    return tx.campaign.create({
      data: {
        name: input.name,
        isOpen: open,
        endsAt: input.endsAt ? new Date(input.endsAt) : null,
      },
    });
  });
}

/** Cerrar una campaña congela su corte: deja de aceptar respuestas nuevas. */
export async function closeCampaign(id: string) {
  const prisma = db();
  const campaign = await prisma.campaign.findUnique({ where: { id } });
  if (!campaign) throw new HttpError(404, 'La campaña no existe.');

  return prisma.campaign.update({
    where: { id },
    data: { isOpen: false, endsAt: campaign.endsAt ?? new Date() },
  });
}
