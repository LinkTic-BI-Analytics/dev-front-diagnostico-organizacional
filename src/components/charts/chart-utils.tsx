'use client';

import { useLayoutEffect, useState, type ReactNode } from 'react';

/**
 * El ancho real del contenedor, para que los gráficos SVG dibujen a escala 1:1 en vez de
 * estirarse con `viewBox`: estirado, el texto del eje crece y se encoge con la pantalla y
 * las líneas de 1 px se vuelven borrosas.
 */
export function useMeasure<T extends HTMLElement>() {
  // Ref de callback y no de objeto: el contenedor puede no existir en el primer render (un
  // gráfico que arranca en estado vacío) y aparecer después; así se observa cuando llega.
  const [element, setElement] = useState<T | null>(null);
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    if (!element) return;
    // El observador notifica una vez al empezar a observar, así que no hace falta medir a
    // mano aquí: la primera lectura llega por el mismo camino que las demás.
    const observer = new ResizeObserver((entries) => {
      const next = entries[0]?.contentRect.width;
      if (next !== undefined) setWidth(next);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [element]);

  return { ref: setElement, width };
}

/**
 * Marcas de eje en números redondos (0, 5, 10… o 0, 20, 40…). Un eje en 0, 7, 14, 21
 * obliga a hacer cuentas para leer cualquier punto intermedio.
 */
export function niceTicks(max: number, count = 4): number[] {
  if (max <= 0) return [0, 1];
  const rough = max / count;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= rough) ?? magnitude * 10;
  const top = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let value = 0; value <= top + step / 2; value += step) ticks.push(Math.round(value * 1000) / 1000);
  return ticks;
}

/**
 * El tooltip de los gráficos: el valor primero y en fuerte, la etiqueta después. Va
 * posicionado dentro del contenedor del gráfico y se voltea al llegar al borde derecho
 * para no salirse de la tarjeta.
 *
 * Mejora la lectura pero nunca es el único camino al dato: cada gráfico tiene su vista de
 * tabla, y las cifras clave van rotuladas sobre las marcas.
 */
export function ChartTooltip({
  x,
  y,
  containerWidth,
  children,
}: {
  x: number;
  y: number;
  containerWidth: number;
  children: ReactNode;
}) {
  const flip = x > containerWidth - 200;
  return (
    <div
      role="presentation"
      className="pointer-events-none absolute z-20 min-w-36 rounded-xl bg-navy-900 px-3 py-2 text-xs text-slate-200 shadow-[0_12px_32px_-12px_#06142b99]"
      style={{
        left: flip ? undefined : x + 14,
        right: flip ? containerWidth - x + 14 : undefined,
        top: Math.max(y - 12, 0),
      }}
    >
      {children}
    </div>
  );
}

/** Una fila del tooltip: la muestra de la serie (un trazo corto), el valor y su nombre. */
export function TooltipRow({
  color,
  value,
  label,
}: {
  color?: string;
  value: ReactNode;
  label: ReactNode;
}) {
  return (
    <p className="flex items-center gap-2 whitespace-nowrap">
      {color && <span aria-hidden className="h-0.5 w-3 rounded-full" style={{ backgroundColor: color }} />}
      <span className="font-semibold text-white tabular-nums">{value}</span>
      <span className="text-slate-300">{label}</span>
    </p>
  );
}

/** Retraso escalonado de la animación de entrada de una marca, acotado para listas largas. */
export function stagger(index: number, step = 0.04, max = 0.6): React.CSSProperties {
  return { ['--lk-retraso' as string]: `${Math.min(index * step, max)}s` };
}
