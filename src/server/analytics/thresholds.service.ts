import { db } from '../db';
import type { ThresholdBand } from './indicators/indicator.types';

/**
 * Vigencia de la caché por instancia. Las bandas casi nunca cambian, pero con Fluid compute
 * una instancia de Vercel puede vivir horas: sin vencimiento, un cambio hecho en la base no
 * llegaría a las instancias que ya estaban calientes.
 */
const CACHE_TTL_MS = 60_000;

let cache: { bands: ThresholdBand[]; expiresAt: number } | null = null;

/**
 * Bandas de semaforización. Viven en la base (`indicator_thresholds`) y no en el front para
 * que LinkTIC pueda ajustar rangos y colores sin desplegar.
 */
export async function getBands(): Promise<ThresholdBand[]> {
  if (cache && cache.expiresAt > Date.now()) return cache.bands;

  const rows = await db().indicatorThreshold.findMany({
    orderBy: { sortOrder: 'asc' },
  });

  const bands = rows.map((row) => ({
    label: row.label,
    minValue: Number(row.minValue),
    maxValue: Number(row.maxValue),
    color: row.color,
  }));
  cache = { bands, expiresAt: Date.now() + CACHE_TTL_MS };
  return bands;
}

/** Clasifica un índice 0-100. Un valor nulo no tiene banda: no hay dato que calificar. */
export function classifyWith(
  bands: ThresholdBand[],
  value: number | null,
): ThresholdBand | null {
  if (value === null) return null;
  return (
    bands.find((band) => value >= band.minValue && value <= band.maxValue) ??
    null
  );
}
