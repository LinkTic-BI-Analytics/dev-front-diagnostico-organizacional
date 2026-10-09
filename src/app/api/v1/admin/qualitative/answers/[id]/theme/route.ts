import { z } from 'zod';
import { updateTheme } from '@/server/analytics/analytics.service';
import { updateThemeSchema } from '@/server/analytics/dto/analytics-filters.schema';
import { recordAudit } from '@/server/auth/audit';
import { hashIp } from '@/server/auth/auth.service';
import { clientIp, handler, parseBody, parseParams } from '@/server/http';

const paramsSchema = z.object({
  id: z.string().regex(/^\d+$/, 'El id de la respuesta debe ser numérico.'),
});

/** Agrupación temática manual de las respuestas abiertas (KPI 19). */
export const PATCH = handler(
  async (request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = parseParams(await params, paramsSchema);
    const { theme = null } = await parseBody(request, updateThemeSchema);

    const updated = await updateTheme(id, theme);
    await recordAudit('THEME_UPDATE', hashIp(clientIp(request)), {
      answerId: id,
      theme,
    });
    return { id: String(updated.id), theme: updated.theme };
  },
  { admin: true },
);
