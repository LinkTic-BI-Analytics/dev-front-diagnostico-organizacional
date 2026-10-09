import Image from 'next/image';

/**
 * Logotipo corporativo.
 *
 * Hay dos versiones y se elige por el fondo, no por un tema: la primaria a color sobre los
 * planos claros, y la de una tinta en blanco sobre el chrome navy (menú lateral, portadas,
 * login). El manual prohíbe recolorear el logotipo, así que no hay filtros CSS de por
 * medio: cada archivo sale tal cual del PDF del manual.
 */

/**
 * Dimensiones reales de los archivos. Van a `next/image` tal cual, y el tamaño de
 * presentación se fija por CSS con la otra dimensión en `auto`: un par redondeado a mano no
 * coincide con el cálculo del navegador, y fijar los dos lados deformaría el logotipo.
 */
const LOGO = { width: 1200, height: 561 };
const ISOTIPO = { width: 481, height: 640 };

/** Mínimo del manual para web. Por debajo, el eslogan deja de ser legible. */
export const LOGO_MIN_WIDTH = 130;

type Surface = 'light' | 'dark';

interface LogoProps {
  /** Ancho de presentación en px. El manual fija 200 px en web y 130 px como mínimo. */
  width?: number;
  /** Sobre qué fondo va: decide la versión del archivo. */
  surface?: Surface;
  className?: string;
  /** El logotipo de la primera pantalla entra en el LCP y conviene precargarlo. */
  priority?: boolean;
}

export function LinkticLogo({ width = 200, surface = 'light', className, priority }: LogoProps) {
  return (
    <Image
      src={surface === 'dark' ? '/brand/linktic-logo-blanco.png' : '/brand/linktic-logo.png'}
      // El alt lleva el eslogan porque forma parte del logotipo que se está mostrando.
      alt="LinkTIC — evolucionamos contigo"
      {...LOGO}
      // Sin esto el navegador se traería el archivo a tamaño completo para una marca de
      // 200 px: `sizes` le dice cuál de las variantes optimizadas necesita.
      sizes={`${width}px`}
      style={{ width, height: 'auto' }}
      priority={priority}
      className={className}
    />
  );
}

/**
 * Isotipo solo (el pinzón). Es la marca para espacios donde el logotipo completo caería
 * por debajo de su tamaño mínimo: el menú lateral, la barra móvil, el icono.
 *
 * Sobre el navy va a color, como en la línea gráfica de referencia: el pinzón tiene
 * contraste propio sobre fondo oscuro y la versión a una tinta queda para el logotipo.
 */
export function LinkticIsotipo({
  height = 32,
  surface = 'light',
  className,
  priority,
  monochrome,
}: Omit<LogoProps, 'width'> & { height?: number; monochrome?: boolean }) {
  const src =
    monochrome && surface === 'dark'
      ? '/brand/linktic-isotipo-blanco.png'
      : '/brand/linktic-isotipo.png';
  return (
    <Image
      src={src}
      alt="LinkTIC"
      {...ISOTIPO}
      sizes={`${Math.round((height * ISOTIPO.width) / ISOTIPO.height)}px`}
      style={{ height, width: 'auto' }}
      priority={priority}
      className={className}
    />
  );
}
