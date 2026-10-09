import { getResponsesPage } from '@/server/analytics/analytics.service';
import { paginatedFiltersSchema } from '@/server/analytics/dto/analytics-filters.schema';
import { handler, parseQuery } from '@/server/http';

export const GET = handler(
  async (request) => {
    const {
      page = 1,
      pageSize = 50,
      ...filters
    } = parseQuery(request, paginatedFiltersSchema);
    return getResponsesPage(filters, page, pageSize);
  },
  { admin: true },
);
