import { getAreaDetail } from '@/server/analytics/analytics.service';
import { analyticsFiltersSchema } from '@/server/analytics/dto/analytics-filters.schema';
import { handler, parseQuery } from '@/server/http';

export const GET = handler(
  async (request, { params }: { params: Promise<{ code: string }> }) =>
    getAreaDetail(
      (await params).code,
      parseQuery(request, analyticsFiltersSchema),
    ),
  { admin: true },
);
