import type { IconName } from '@/components/ui/icons';

export interface NavItem {
  href: string;
  label: string;
  icon: IconName;
  /** Solo se marca activo en su ruta exacta (el resumen); los demás aceptan subrutas. */
  exact?: boolean;
  /** Cifra o rótulo al margen: cuántos índices, cuántos componentes. */
  badge?: string;
  /** Marca de «en vivo»: la vista se actualiza sola. */
  live?: boolean;
  /** Para el buscador: palabras con las que alguien la buscaría sin saber su nombre. */
  keywords?: string;
}

/**
 * El orden es el del uso: se entra por el resumen, y las demás vistas son el detalle de lo
 * que el resumen concluye. El monitoreo va aparte, abajo, porque no es análisis sino
 * operación: se mira mientras la encuesta está abierta y deja de mirarse al cerrarla.
 */
export const ANALYSIS_NAV: NavItem[] = [
  {
    href: '/admin',
    label: 'Resumen ejecutivo',
    icon: 'home',
    exact: true,
    keywords: 'dashboard inicio portada imc conclusión',
  },
  {
    href: '/admin/indices',
    label: 'Índices',
    icon: 'gauge',
    badge: '8',
    keywords: 'imc nps pesos compuesto radar semáforo',
  },
  {
    href: '/admin/componentes',
    label: 'Componentes',
    icon: 'layers',
    badge: '10',
    keywords: 'agilidad innovación instrumento',
  },
  {
    href: '/admin/preguntas',
    label: 'Preguntas',
    icon: 'list',
    keywords: 'afirmaciones ítems likert distribución consenso notas peor mejor',
  },
  {
    href: '/admin/mapa',
    label: 'Mapa de relacionamiento',
    icon: 'network',
    keywords: 'matriz brecha percepción evalúa aspectos',
  },
  {
    href: '/admin/interaccion',
    label: 'Red de interacción',
    icon: 'share',
    keywords: 'demanda frecuencia tipo interacción valor fortalecer innovación aisladas críticas',
  },
  {
    href: '/admin/cualitativo',
    label: 'Cualitativo',
    icon: 'message',
    keywords: 'obstáculos motivos respuestas abiertas temas ideas',
  },
];

export const OPERATION_NAV: NavItem[] = [
  {
    href: '/admin/metodologia',
    label: 'Metodología y datos',
    icon: 'book',
    keywords: 'fórmulas cohorte anonimato fuentes umbrales bandas',
  },
  {
    href: '/admin/respuestas',
    label: 'Monitoreo en vivo',
    icon: 'live',
    live: true,
    keywords: 'respuestas recolección participación abandono exportar excel csv',
  },
];

export const AREAS_INDEX: NavItem = {
  href: '/admin/areas',
  label: 'Todas las áreas',
  icon: 'grid',
  keywords: 'subprocesos gestiones fichas',
};

export function isActive(item: Pick<NavItem, 'href' | 'exact'>, pathname: string): boolean {
  return item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
}
