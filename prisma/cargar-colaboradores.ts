/**
 * Carga la nómina en `colaboradores` desde el CSV que exporta el ERP.
 *
 *   npm run prisma:colaboradores -- <archivo.csv>              # muestra qué haría; no escribe
 *   npm run prisma:colaboradores -- <archivo.csv> --aplicar    # escribe
 *
 * Columnas del ERP: numero_identificacion, colaborador, cargo, proceso, categoria (la
 * categoría va a `subproceso`). El archivo no se copia al repositorio: tiene nombres y
 * documentos.
 *
 * Se puede volver a correr con una nómina nueva: quien ya está se actualiza solo si cambió
 * su nombre, cargo, proceso o subproceso, y `ya_respondio` no se toca nunca. Quien está en la
 * base y no en el archivo no se borra —borrarlo le quitaría la marca de que ya respondió—:
 * se lista para revisarlo a mano.
 */
import './load-env';
import { readFileSync } from 'node:fs';
import { createPrismaClient } from '../src/server/db';
import { cambio, leerNomina, type FilaNomina } from './nomina';

const prisma = createPrismaClient();

const aplicar = process.argv.includes('--aplicar');
const archivo = process.argv.slice(2).find((arg) => !arg.startsWith('--'));

/** Filas por `createMany`: muy por debajo del tope de parámetros de Postgres. */
const LOTE = 500;

async function main() {
  if (!archivo) {
    throw new Error('Indique el CSV: npm run prisma:colaboradores -- <archivo.csv> [--aplicar]');
  }

  const { filas, invalidas, duplicados } = leerNomina(readFileSync(archivo, 'utf8'));

  const existentes = new Map<string, FilaNomina>(
    (
      await prisma.colaborador.findMany({
        select: {
          numeroDocumento: true,
          nombre: true,
          cargo: true,
          proceso: true,
          subproceso: true,
        },
      })
    ).map((colaborador) => [colaborador.numeroDocumento, colaborador]),
  );

  const nuevos = filas.filter((fila) => !existentes.has(fila.numeroDocumento));
  const cambiados = filas.filter((fila) => {
    const antes = existentes.get(fila.numeroDocumento);
    return antes !== undefined && cambio(antes, fila);
  });
  const enArchivo = new Set(filas.map((fila) => fila.numeroDocumento));
  const sobrantes = [...existentes.keys()].filter((doc) => !enArchivo.has(doc));

  console.log(`Nómina: ${archivo}`);
  console.log(`  ${filas.length} colaboradores válidos en el archivo`);
  console.log(`  ${nuevos.length} nuevos · ${cambiados.length} con cambios · ` +
    `${filas.length - nuevos.length - cambiados.length} sin cambios`);
  for (const { fila, documento, nombre } of invalidas) {
    console.log(`  ✗ fila ${fila}: documento inválido «${documento}» (${nombre || 'sin nombre'})`);
  }
  for (const { documento, filas: vistas } of duplicados) {
    console.log(`  · ${documento} aparece en las filas ${vistas.join(', ')}: se carga la primera`);
  }
  if (sobrantes.length > 0) {
    console.log(`  · ${sobrantes.length} en la base y no en el archivo (no se borran): ` +
      sobrantes.slice(0, 20).join(', ') + (sobrantes.length > 20 ? '…' : ''));
  }

  if (!aplicar) {
    console.log('\nNo se escribió nada. Para cargar, repita con --aplicar.');
    return;
  }

  // Todo o nada: si una escritura falla, la nómina queda como estaba.
  await prisma.$transaction([
    ...Array.from({ length: Math.ceil(nuevos.length / LOTE) }, (_, i) =>
      prisma.colaborador.createMany({
        data: nuevos.slice(i * LOTE, (i + 1) * LOTE),
        skipDuplicates: true,
      }),
    ),
    ...cambiados.map(({ numeroDocumento, ...datos }) =>
      prisma.colaborador.update({ where: { numeroDocumento }, data: datos }),
    ),
  ]);

  const total = await prisma.colaborador.count();
  console.log(`\n✔ Cargados ${nuevos.length} y actualizados ${cambiados.length}. ` +
    `La tabla tiene ${total} colaboradores.`);
}

main()
  .catch((error) => {
    console.error('La carga de la nómina falló:', error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
