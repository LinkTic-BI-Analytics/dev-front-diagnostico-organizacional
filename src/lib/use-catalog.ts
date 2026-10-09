'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getSchema } from './survey-client';
import type { Area, Proceso } from './survey-schema.types';

export interface Gestion {
  code: string;
  /** El nombre completo del catálogo: «Gestión de talento humano». */
  name: string;
  /** El nombre sin el prefijo «Gestión de», para el menú y las migas: «Talento humano». */
  shortName: string;
  areas: Area[];
}

/**
 * El organigrama tal como lo trae el catálogo público: las gestiones y sus subprocesos.
 *
 * Lo usan el menú lateral, el buscador y las migas de pan de la ficha de área. Sale del
 * mismo `GET /survey/schema` que dirige la encuesta —y que `useAreaNames` ya cachea—, así
 * que el panel nunca tiene una lista de áreas propia que se pueda desincronizar.
 */
export function useCatalog() {
  const query = useQuery({
    queryKey: ['survey-schema'],
    queryFn: () => getSchema(),
    staleTime: 30 * 60_000,
  });

  const gestiones = useMemo<Gestion[]>(() => {
    const schema = query.data;
    if (!schema) return [];
    const evaluables = schema.areas.filter((area) => area.isEvaluable);
    return schema.procesos
      .map((proceso: Proceso) => ({
        code: proceso.code,
        name: proceso.name,
        shortName: shortGestionName(proceso.name),
        areas: evaluables.filter((area) => area.procesoCode === proceso.code),
      }))
      .filter((gestion) => gestion.areas.length > 0);
  }, [query.data]);

  const areaCount = useMemo(
    () => gestiones.reduce((sum, gestion) => sum + gestion.areas.length, 0),
    [gestiones],
  );

  return { gestiones, areaCount, isLoading: query.isLoading };
}

/** «Gestión de talento humano» → «Talento humano»; «Gestión TI» → «TI». */
export function shortGestionName(name: string): string {
  const stripped = name.replace(/^gesti[oó]n\s+(de\s+|del\s+)?/i, '').trim();
  if (!stripped) return name;
  return stripped.charAt(0).toUpperCase() + stripped.slice(1);
}
