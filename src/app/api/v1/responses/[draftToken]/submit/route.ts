import { handler } from '@/server/http';
import { submitResponse } from '@/server/responses/responses.service';

export const POST = handler(
  async (_request, { params }: { params: Promise<{ draftToken: string }> }) =>
    submitResponse((await params).draftToken),
  { status: 201 },
);
