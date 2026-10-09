import { z } from 'zod';
import { handler, parseBody, parseParams } from '@/server/http';
import { saveStep } from '@/server/responses/responses.service';
import { saveStepSchema } from '@/server/responses/save-step.schema';

const paramsSchema = z.object({
  draftToken: z.string(),
  componentId: z
    .string()
    .regex(/^-?\d+$/, 'El componente debe ser un número entero.')
    .transform(Number),
});

export const PATCH = handler(
  async (
    request,
    {
      params,
    }: { params: Promise<{ draftToken: string; componentId: string }> },
  ) => {
    const { draftToken, componentId } = parseParams(
      await params,
      paramsSchema,
    );
    return saveStep(
      draftToken,
      componentId,
      await parseBody(request, saveStepSchema),
    );
  },
);
