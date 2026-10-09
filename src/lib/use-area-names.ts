'use client';

import { useQuery } from '@tanstack/react-query';
import { getSchema } from './survey-client';

/**
 * Códigos de área y de gestión traducidos a su nombre.
 *
 * Varios endpoints de analítica devuelven el código en crudo —`CONTRATACION_PUBLICA`—
 * porque su cálculo trabaja con códigos. Mostrarlo así obliga al lector a traducir de
 * memoria un catálogo de más de cincuenta subprocesos, que es justo lo que un panel no
 * debe pedir.
 *
 * Sale del catálogo público de la encuesta, que ya trae el árbol completo con nombres, y
 * se cachea largo: el catálogo solo cambia cuando cambia el organigrama.
 */
export function useAreaNames(): (code: string | null | undefined) => string {
  const query = useQuery({
    queryKey: ['survey-schema'],
    queryFn: () => getSchema(),
    staleTime: 30 * 60_000,
  });

  const byCode = new Map<string, string>();
  for (const area of query.data?.areas ?? []) byCode.set(area.code, area.name);
  for (const proceso of query.data?.procesos ?? []) {
    if (!byCode.has(proceso.code)) byCode.set(proceso.code, proceso.name);
  }

  // Mientras el catálogo no llega, se muestra el código: es preferible a un hueco.
  return (code) => (code ? (byCode.get(code) ?? code) : '—');
}
