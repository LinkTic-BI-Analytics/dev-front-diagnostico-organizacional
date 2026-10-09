import { handler } from '@/server/http';
import { getDraft } from '@/server/responses/responses.service';

export const GET = handler(
  async (_request, { params }: { params: Promise<{ draftToken: string }> }) =>
    getDraft((await params).draftToken),
);
