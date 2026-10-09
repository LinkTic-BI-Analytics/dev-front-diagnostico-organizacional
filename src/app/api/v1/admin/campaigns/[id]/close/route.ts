import { z } from 'zod';
import { recordAudit } from '@/server/auth/audit';
import { hashIp } from '@/server/auth/auth.service';
import { closeCampaign } from '@/server/campaigns/campaigns.service';
import { clientIp, handler, parseParams } from '@/server/http';

/** Cerrar una campaña congela su corte: deja de aceptar respuestas nuevas. */
export const PATCH = handler(
  async (request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = parseParams(await params, z.object({ id: z.uuid() }));
    const campaign = await closeCampaign(id);
    await recordAudit('CAMPAIGN_CLOSE', hashIp(clientIp(request)), {
      campaignId: id,
    });
    return campaign;
  },
  { admin: true },
);
