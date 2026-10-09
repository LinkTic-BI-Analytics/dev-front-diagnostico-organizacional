'use client';

import { useQuery } from '@tanstack/react-query';
import { getIndicators } from './admin-client';
import type { ThresholdBand } from './admin.types';

/**
 * Umbrales de semaforización, leídos de la API.
 *
 * NO se hardcodean en el front: viven en `indicator_thresholds` para que LinkTIC pueda
 * ajustar rangos y colores sin desplegar. Se comparte la caché de TanStack Query para que
 * varias pantallas no repitan la consulta.
 */
export function useThresholds(): ThresholdBand[] {
  const query = useQuery({
    queryKey: ['indicators'],
    queryFn: () => getIndicators(),
    staleTime: 5 * 60_000,
  });

  return query.data?.data?.thresholds ?? [];
}
