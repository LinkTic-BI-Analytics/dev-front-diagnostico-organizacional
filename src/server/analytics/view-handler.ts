import { handler, parseQuery } from '../http';
import { analyticsFiltersSchema } from './dto/analytics-filters.schema';
import type { AnalyticsFilters } from './dto/analytics.dto';

/**
 * Route handler de una vista del panel: exige sesión de admin, valida los filtros globales
 * de la query y devuelve lo que calcule la vista. La cohorte mínima la aplica cada función
 * del servicio, no esta capa.
 */
export function analyticsView(
  view: (filters: AnalyticsFilters) => Promise<unknown>,
) {
  return handler(
    (request) => view(parseQuery(request, analyticsFiltersSchema)),
    { admin: true },
  );
}
