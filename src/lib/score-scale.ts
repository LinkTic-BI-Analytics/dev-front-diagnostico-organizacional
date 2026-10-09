import type { ThresholdBand } from './admin.types';

/** Resuelve la banda de un índice 0-100 usando los umbrales que envió la API. */
export function classify(
  value: number | null,
  bands: ThresholdBand[],
): ThresholdBand | null {
  if (value === null) return null;
  return bands.find((band) => value >= band.minValue && value <= band.maxValue) ?? null;
}

/*
 * Las cifras se escriben como se escriben en español de Colombia: coma decimal, punto de
 * miles y un espacio fino antes del signo de porcentaje («75,9 %»). Es lo que hace la
 * línea gráfica de referencia, y un panel que alterna «57.6» en las tarjetas con «57,6» en
 * las lecturas obliga a pensar cuál de los dos es el dato.
 */
const LOCALE = 'es-CO';
const formatters = new Map<number, Intl.NumberFormat>();

function numberFormat(decimals: number): Intl.NumberFormat {
  let formatter = formatters.get(decimals);
  if (!formatter) {
    formatter = new Intl.NumberFormat(LOCALE, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
    formatters.set(decimals, formatter);
  }
  return formatter;
}

/** Un número con sus decimales fijos. Base de todos los formateadores de abajo. */
export function formatNumber(value: number, decimals = 0): string {
  return numberFormat(decimals).format(value);
}

/** Formatea un índice para tarjetas (entero) o tablas (un decimal). */
export function formatIndex(value: number | null, decimals = 0): string {
  if (value === null) return '—';
  return formatNumber(value, decimals);
}

/**
 * El NPS lleva signo explícito: un +12 y un −12 son lecturas opuestas. El menos es el
 * signo tipográfico (U+2212) y no el guion: con el guion la cifra negativa se ve más corta
 * que la positiva y desalinea las columnas.
 */
export function formatNps(value: number | null): string {
  if (value === null) return '—';
  const rounded = Math.round(value);
  if (rounded > 0) return `+${rounded}`;
  if (rounded < 0) return `−${Math.abs(rounded)}`;
  return '0';
}

/** Una diferencia con signo, p. ej. la brecha de percepción: «+12,4» o «−3,0». */
export function formatSigned(value: number | null, decimals = 1): string {
  if (value === null) return '—';
  const text = formatNumber(Math.abs(value), decimals);
  if (value > 0) return `+${text}`;
  if (value < 0) return `−${text}`;
  return text;
}

export function formatShare(value: number | null, decimals = 1): string {
  return value === null ? '—' : `${formatNumber(value, decimals)} %`;
}

export function formatCount(value: number): string {
  return formatNumber(value, 0);
}

export function formatDuration(seconds: number | null): string {
  if (seconds === null) return '—';
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  if (minutes === 0) return `${rest} s`;
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    return `${hours} h ${String(minutes % 60).padStart(2, '0')} min`;
  }
  return `${minutes} min ${String(rest).padStart(2, '0')} s`;
}

/** Fecha corta del corte de datos: «5 oct 2026». */
export function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(LOCALE, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'America/Bogota',
  });
}

/** Fecha y hora en reloj de 24 horas: «5 oct 2026, 10:42». */
export function formatDateTime(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(LOCALE, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone: 'America/Bogota',
  });
}

const relative = new Intl.RelativeTimeFormat(LOCALE, { numeric: 'auto' });

/**
 * «hace 3 min», «hace 2 h», «ayer». Para el monitoreo, donde lo que importa es si la
 * recolección sigue viva, no la hora exacta.
 */
export function formatRelative(iso: string | null, now: number = Date.now()): string {
  if (!iso) return '—';
  const seconds = Math.round((new Date(iso).getTime() - now) / 1000);
  const abs = Math.abs(seconds);
  if (abs < 45) return 'hace un momento';
  if (abs < 3600) return relative.format(Math.round(seconds / 60), 'minute');
  if (abs < 86_400) return relative.format(Math.round(seconds / 3600), 'hour');
  return relative.format(Math.round(seconds / 86_400), 'day');
}

/**
 * Relleno de una celda de matriz: un velo del color de banda, no el color a plena carga.
 *
 * La intensidad sube con la severidad, así que la cuadrícula se lee por manchas antes de
 * leer un solo número. El texto se queda en tinta normal —no hay que calcular contraste
 * contra cada relleno— y el número sigue siendo el dato: el color solo lo acompaña, que es
 * lo que corresponde cuando las cuatro bandas no se distinguen entre sí por color a secas.
 */
export function heatFill(
  band: ThresholdBand | null,
  bands: ThresholdBand[],
): { backgroundColor: string } {
  if (!band) return { backgroundColor: 'var(--surface-muted)' };
  const index = bands.findIndex((entry) => entry.label === band.label);
  const step = Math.min(Math.max(index, 0), 3) + 1;
  return {
    backgroundColor: `color-mix(in srgb, ${band.color} var(--heat-${step}), transparent)`,
  };
}
