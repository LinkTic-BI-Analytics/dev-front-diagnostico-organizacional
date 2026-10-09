'use client';

import { useMemo, useSyncExternalStore } from 'react';
import type { AdminFilters } from './admin.types';

/**
 * Los filtros globales del análisis (Contexto.md §4.5): área de origen, cargo, frecuencia
 * y tipo de interacción, y rango de fechas.
 *
 * Viven en la sesión del navegador y no en la URL a propósito: un filtro global tiene que
 * acompañar a quien analiza cuando salta del resumen al mapa o a las preguntas, y en la
 * URL se perdería con cada enlace del menú. `sessionStorage` y no `localStorage`: al cerrar
 * la pestaña el siguiente análisis empieza sobre la empresa completa, que es lo que se
 * espera al abrir el panel.
 *
 * La regla de anonimato no cambia: cada corte filtrado sigue pasando por la cohorte mínima
 * en el servidor, así que filtrar demasiado fino muestra el aviso, nunca el dato.
 */
export type FilterKey = 'ownArea' | 'respondentRole' | 'frecuencia' | 'tipoInteraccion' | 'from' | 'to';

export type AnalysisFilters = Pick<AdminFilters, FilterKey>;

const STORAGE_KEY = 'linktic-filtros';
const EMPTY: AnalysisFilters = {};

function load(): AnalysisFilters {
  if (typeof window === 'undefined') return EMPTY;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AnalysisFilters) : EMPTY;
  } catch {
    return EMPTY;
  }
}

let state: AnalysisFilters = load();
const listeners = new Set<() => void>();

function emit(next: AnalysisFilters) {
  state = next;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Sin almacenamiento el filtro dura lo que la vista: degradación aceptable.
  }
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Quita las claves vacías: «sin filtro» y «filtro vacío» tienen que ser el mismo estado. */
function clean(filters: AnalysisFilters): AnalysisFilters {
  return Object.fromEntries(
    Object.entries(filters).filter(([, value]) => typeof value === 'string' && value !== ''),
  ) as AnalysisFilters;
}

export function useAnalysisFilters() {
  const filters = useSyncExternalStore(subscribe, () => state, () => EMPTY);

  /*
   * Los mismos filtros como los espera la API. Las fechas del selector son días de Bogotá:
   * «hasta el 5 de octubre» incluye lo enviado ese día, así que `to` va al último segundo y
   * no a la medianoche inicial. Es estable mientras el filtro no cambie, así que sirve de
   * clave de consulta sin provocar recargas.
   */
  const apiFilters = useMemo<AdminFilters>(
    () => ({
      ...filters,
      from: filters.from ? `${filters.from}T00:00:00-05:00` : undefined,
      to: filters.to ? `${filters.to}T23:59:59-05:00` : undefined,
    }),
    [filters],
  );

  return {
    filters,
    apiFilters,
    /** Cuántos filtros hay puestos: lo que dice el contador del botón en móvil. */
    activeCount: Object.keys(filters).length,
    setFilter: (key: FilterKey, value: string | undefined) =>
      emit(clean({ ...state, [key]: value })),
    clear: () => emit(EMPTY),
  };
}
