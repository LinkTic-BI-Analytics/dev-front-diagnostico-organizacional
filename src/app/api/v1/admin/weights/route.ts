import { updateWeightsSchema } from '@/server/analytics/dto/analytics-filters.schema';
import { listWeights, updateWeights } from '@/server/analytics/weights.service';
import { recordAudit } from '@/server/auth/audit';
import { hashIp } from '@/server/auth/auth.service';
import { clientIp, handler, parseBody } from '@/server/http';

export const GET = handler(() => listWeights(), { admin: true });

/** Los pesos del IMC son auditables: cambiarlos altera el KPI titular de la organización. */
export const PUT = handler(
  async (request) => {
    const { weights } = await parseBody(request, updateWeightsSchema);
    const updated = await updateWeights(weights);
    await recordAudit('WEIGHTS_UPDATE', hashIp(clientIp(request)), {
      weights,
    });
    return updated;
  },
  { admin: true },
);
