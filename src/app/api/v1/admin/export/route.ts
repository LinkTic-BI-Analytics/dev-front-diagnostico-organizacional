import { z } from 'zod';
import { recordAudit } from '@/server/auth/audit';
import { hashIp } from '@/server/auth/auth.service';
import { exportAnswers } from '@/server/export/export.service';
import { clientIp, handler, parseQuery } from '@/server/http';

/** La exportación recorre toda la base por lotes: se le da más margen que al resto. */
export const maxDuration = 60;

const exportQuerySchema = z
  .object({
    format: z.enum(['csv', 'xlsx']).optional(),
    campaignId: z.uuid().optional(),
  })
  .strict();

/** Cada descarga se audita: son datos de percepción de personas identificables por área. */
export const GET = handler(
  async (request) => {
    const { format = 'csv', campaignId } = parseQuery(
      request,
      exportQuerySchema,
    );
    await recordAudit(
      format === 'xlsx' ? 'EXPORT_XLSX' : 'EXPORT_CSV',
      hashIp(clientIp(request)),
      { campaignId: campaignId ?? null },
    );
    return exportAnswers(format, campaignId);
  },
  { admin: true },
);
