import { db } from '../db';
import { HttpError } from '../http';
import { IMC_COMPONENT_CODES } from './indicators/question-codes.constant';

const WEIGHT_SUM_TOLERANCE = 0.0005;

/**
 * Vigencia de la caché por instancia. Quien edita los pesos limpia la de su instancia al
 * momento; las demás instancias calientes los releen al vencer, en vez de servir los
 * anteriores hasta su próximo arranque en frío.
 */
const CACHE_TTL_MS = 60_000;

let cache: { weights: Map<string, number>; expiresAt: number } | null = null;

/**
 * Pesos del IMC. Se cachean porque se leen en cada request del dashboard y solo cambian
 * cuando un admin los edita explícitamente.
 */
export async function getWeights(): Promise<Map<string, number>> {
  if (cache && cache.expiresAt > Date.now()) return cache.weights;

  const rows = await db().indicatorWeight.findMany();
  const weights = new Map(
    rows.map((row) => [row.indicatorCode, Number(row.weight)]),
  );

  // Un peso faltante desbalancea el compuesto en silencio: se avisa, y `computeImc`
  // reescala sobre los que sí existen.
  const missing = IMC_COMPONENT_CODES.filter((code) => !weights.has(code));
  if (missing.length > 0) {
    console.warn(`Faltan pesos del IMC en la base: ${missing.join(', ')}`);
  }

  cache = { weights, expiresAt: Date.now() + CACHE_TTL_MS };
  return weights;
}

export async function listWeights() {
  const weights = await getWeights();
  return [...weights.entries()].map(([indicatorCode, weight]) => ({
    indicatorCode,
    weight,
  }));
}

/**
 * Actualiza los pesos. Valida que sumen 1 ANTES de escribir: dejar pasar una suma distinta
 * haría que el IMC deje de ser comparable entre cortes sin que nadie lo note.
 */
export async function updateWeights(
  input: { indicatorCode: string; weight: number }[],
) {
  const unknown = input.filter(
    (entry) => !IMC_COMPONENT_CODES.includes(entry.indicatorCode as never),
  );
  if (unknown.length > 0) {
    throw new HttpError(
      400,
      `Estos indicadores no componen el IMC: ${unknown.map((e) => e.indicatorCode).join(', ')}.`,
    );
  }

  const sum = input.reduce((total, entry) => total + entry.weight, 0);
  if (Math.abs(sum - 1) > WEIGHT_SUM_TOLERANCE) {
    throw new HttpError(
      400,
      `Los pesos deben sumar 1.000; la propuesta suma ${sum.toFixed(3)}.`,
    );
  }

  const prisma = db();
  await prisma.$transaction(
    input.map((entry) =>
      prisma.indicatorWeight.upsert({
        where: { indicatorCode: entry.indicatorCode },
        update: { weight: entry.weight },
        create: { indicatorCode: entry.indicatorCode, weight: entry.weight },
      }),
    ),
  );

  cache = null;
  return listWeights();
}
