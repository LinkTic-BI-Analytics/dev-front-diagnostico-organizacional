import type { QuestionOption } from '@/lib/survey-schema.types';

export interface OptionGroup {
  /** `null` en el grupo de opciones sueltas (p. ej. "Ninguna"). */
  code: string | null;
  label: string | null;
  options: QuestionOption[];
}

/**
 * Parte las opciones en los grupos que declara el catálogo, conservando el orden en que
 * llegaron. Las áreas vienen agrupadas por gestión: más de cincuenta subprocesos en una
 * lista plana son ilegibles, y la gestión es justamente la pista que el encuestado usa para
 * ubicarse.
 *
 * Las opciones sin grupo (las estáticas, como "Ninguna") caen en un grupo sin título al
 * final, para que nunca queden escondidas bajo un encabezado que no les corresponde.
 */
export function groupOptions(options: QuestionOption[]): OptionGroup[] {
  const groups: OptionGroup[] = [];
  const byCode = new Map<string, OptionGroup>();
  let loose: OptionGroup | null = null;

  for (const option of options) {
    if (!option.group) {
      loose ??= { code: null, label: null, options: [] };
      loose.options.push(option);
      continue;
    }

    let group = byCode.get(option.group.code);
    if (!group) {
      group = { code: option.group.code, label: option.group.label, options: [] };
      byCode.set(option.group.code, group);
      groups.push(group);
    }
    group.options.push(option);
  }

  if (loose) groups.push(loose);
  return groups;
}

/** `true` cuando vale la pena pintar encabezados: hay más de un grupo con título. */
export function hasVisibleGroups(groups: OptionGroup[]): boolean {
  return groups.filter((group) => group.label !== null).length > 1;
}

/**
 * Cuántas columnas admite una lista de opciones en pantalla ancha.
 *
 * Las opciones son etiquetas de dos o tres palabras en filas de ancho completo: en un
 * monitor eso deja dos tercios de cada fila en blanco y estira la pantalla a varios
 * scrolls. La encuesta se responde sobre todo desde PC, así que repartirlas en columnas es
 * lo que convierte esa altura sobrante en ancho aprovechado.
 *
 * Se reparte con `columns` de CSS y no con una rejilla a propósito: las columnas conservan
 * el orden de lectura de arriba abajo y equilibran solas bloques de altura desigual —una
 * gestión con cinco subprocesos junto a otra con uno—, cosa que una rejilla solo consigue
 * dejando huecos.
 *
 * Por debajo de cinco opciones no se parte nada: dos columnas de dos elementos no ahorran
 * pantalla y sí obligan a decidir si la lista sigue a la derecha o abajo.
 */
export function optionColumns(count: number): string {
  if (count < 5) return '';
  return 'sm:columns-2 lg:columns-3';
}
