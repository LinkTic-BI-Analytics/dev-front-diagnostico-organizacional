import { handler } from '@/server/http';
import { getSchema } from '@/server/survey/survey.service';

/** Catálogo completo del instrumento. Público: el wizard lo necesita antes de todo. */
export const GET = handler(() => getSchema());
