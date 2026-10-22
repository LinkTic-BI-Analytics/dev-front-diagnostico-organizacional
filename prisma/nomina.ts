/**
 * Lectura de la nómina que exporta el ERP, para cargarla en `colaboradores`.
 *
 * Funciones puras: no tocan la base. Las usa `cargar-colaboradores.ts`, y se prueban aparte
 * en `nomina.spec.ts`.
 */
import { startResponseSchema } from '../src/server/responses/start-response.schema';

export interface FilaNomina {
  numeroDocumento: string;
  nombre: string;
  cargo: string | null;
  proceso: string | null;
  subproceso: string | null;
}

export interface Nomina {
  filas: FilaNomina[];
  /** Filas cuyo documento no tiene forma de documento, ni siquiera normalizado. */
  invalidas: { fila: number; documento: string; nombre: string }[];
  /** Documentos que aparecen más de una vez. Se conserva la primera aparición. */
  duplicados: { documento: string; filas: number[] }[];
}

/**
 * Los encabezados que se aceptan para cada columna. El primero es el del ERP; los demás, los
 * nombres con que se pidió la tabla. La categoría del ERP (DESARROLLO, PRUEBAS QA Y TESTER…)
 * es la agrupación debajo del proceso, así que va a `subproceso`.
 */
const COLUMNAS = {
  numeroDocumento: ['numero_identificacion', 'numero_documento', 'numero de documento'],
  nombre: ['colaborador', 'nombre'],
  cargo: ['cargo'],
  proceso: ['proceso'],
  subproceso: ['categoria', 'subproceso'],
} as const;

/** CSV con comillas, comillas dobladas y saltos de línea dentro de un campo (RFC 4180). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((cells) => cells.some((cell) => cell.trim() !== ''));
}

/**
 * Texto de una celda: sin caracteres invisibles y con los espacios y saltos de línea
 * colapsados («Profesional de Apoyo Junior \n» llega así del ERP). Vacía, es `null`.
 */
export function limpiarTexto(value: string | undefined): string | null {
  const text = (value ?? '').replace(/\p{Cf}/gu, '').replace(/\s+/g, ' ').trim();
  return text === '' ? null : text;
}

function normalizarEncabezado(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/\p{Cf}/gu, '')
    .trim()
    .toLowerCase();
}

/**
 * Convierte el CSV en filas listas para la tabla. El documento pasa por la misma
 * normalización y la misma validación que aplica la API al empezar la encuesta: lo que se
 * carga es exactamente lo que la persona podrá escribir.
 */
export function leerNomina(text: string): Nomina {
  const [encabezado, ...datos] = parseCsv(text.replace(/^\uFEFF/, ''));
  if (!encabezado) throw new Error('El archivo está vacío.');

  const nombres = encabezado.map(normalizarEncabezado);
  const indice = Object.fromEntries(
    Object.entries(COLUMNAS).map(([campo, aceptados]) => [
      campo,
      nombres.findIndex((nombre) => (aceptados as readonly string[]).includes(nombre)),
    ]),
  ) as Record<keyof typeof COLUMNAS, number>;

  for (const campo of ['numeroDocumento', 'nombre'] as const) {
    if (indice[campo] < 0) {
      throw new Error(
        `Falta la columna ${COLUMNAS[campo].join(' o ')}. Encabezados: ${encabezado.join(', ')}`,
      );
    }
  }

  const celda = (cells: string[], campo: keyof typeof COLUMNAS) =>
    indice[campo] < 0 ? undefined : cells[indice[campo]];

  const filas: FilaNomina[] = [];
  const invalidas: Nomina['invalidas'] = [];
  const apariciones = new Map<string, number[]>();

  datos.forEach((cells, i) => {
    const fila = i + 2; // la 1 es el encabezado
    const documentoCrudo = celda(cells, 'numeroDocumento') ?? '';
    const nombre = limpiarTexto(celda(cells, 'nombre'));
    const parsed = startResponseSchema.safeParse({ numeroDocumento: documentoCrudo });

    if (!parsed.success || !nombre) {
      invalidas.push({ fila, documento: documentoCrudo, nombre: nombre ?? '' });
      return;
    }

    const { numeroDocumento } = parsed.data;
    const vistas = apariciones.get(numeroDocumento);
    if (vistas) {
      vistas.push(fila);
      return;
    }
    apariciones.set(numeroDocumento, [fila]);

    filas.push({
      numeroDocumento,
      nombre,
      cargo: limpiarTexto(celda(cells, 'cargo')),
      proceso: limpiarTexto(celda(cells, 'proceso')),
      subproceso: limpiarTexto(celda(cells, 'subproceso')),
    });
  });

  const duplicados = [...apariciones]
    .filter(([, vistas]) => vistas.length > 1)
    .map(([documento, vistas]) => ({ documento, filas: vistas }));

  return { filas, invalidas, duplicados };
}

/** Si los datos de una persona cambiaron respecto de lo que hay en la base. */
export function cambio(antes: FilaNomina, ahora: FilaNomina): boolean {
  return (
    antes.nombre !== ahora.nombre ||
    antes.cargo !== ahora.cargo ||
    antes.proceso !== ahora.proceso ||
    antes.subproceso !== ahora.subproceso
  );
}
