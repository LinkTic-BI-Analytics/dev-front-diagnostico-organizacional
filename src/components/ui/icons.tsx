import type { SVGProps } from 'react';

/**
 * Iconos de trazo, en el mismo dibujo lineal que la línea gráfica de referencia: 24 × 24,
 * trazo de 1,8 y extremos redondeados, para que acompañen al peso de Geist sin competir
 * con el texto. Van como trazados y no como una librería porque son pocos y fijos: una
 * dependencia entera para treinta trazos es peso que el panel no necesita.
 *
 * Todos son decorativos (`aria-hidden`): el significado lo lleva siempre el texto al lado.
 */
const PATHS = {
  home: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z',
  gauge: 'M12 14l3.5-3.5 M3.5 18a9 9 0 1 1 17 0 M12 14m-1.6 0a1.6 1.6 0 1 0 3.2 0a1.6 1.6 0 1 0-3.2 0',
  layers: 'm12 3 9 5-9 5-9-5z M3 13l9 5 9-5 M3 17.5l9 5 9-5',
  network:
    'M12 5m-2.2 0a2.2 2.2 0 1 0 4.4 0a2.2 2.2 0 1 0-4.4 0 M5 18m-2.2 0a2.2 2.2 0 1 0 4.4 0a2.2 2.2 0 1 0-4.4 0 M19 18m-2.2 0a2.2 2.2 0 1 0 4.4 0a2.2 2.2 0 1 0-4.4 0 M10.8 6.9 6.2 16 M13.2 6.9l4.6 9.1 M7.2 18h9.6',
  message: 'M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z M8 9h8 M8 13h5',
  live: 'M12 12m-2 0a2 2 0 1 0 4 0a2 2 0 1 0-4 0 M7.8 7.8a6 6 0 0 0 0 8.4 M16.2 16.2a6 6 0 0 0 0-8.4 M5 5a10 10 0 0 0 0 14 M19 19a10 10 0 0 0 0-14',
  book: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5',
  grid: 'M4 4h7v7H4z M13 4h7v7h-7z M4 13h7v7H4z M13 13h7v7h-7z',
  building: 'M4 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16 M16 9h2a2 2 0 0 1 2 2v10 M3 21h18 M8 7h4 M8 11h4 M8 15h4',
  search: 'M11 11m-7 0a7 7 0 1 0 14 0a7 7 0 1 0-14 0 M20 20l-3.5-3.5',
  logout: 'M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3 M10 17l-5-5 5-5 M5 12h11',
  chevronDown: 'm6 9 6 6 6-6',
  chevronRight: 'm9 6 6 6-6 6',
  chevronLeft: 'm15 6-6 6 6 6',
  menu: 'M4 6h16 M4 12h16 M4 18h16',
  close: 'M6 6l12 12 M18 6 6 18',
  print: 'M7 9V3h10v6 M7 17H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2 M7 14h10v7H7z',
  help: 'M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0-18 0 M9.4 9.2a2.7 2.7 0 0 1 5.2 1c0 1.8-2.6 2.4-2.6 2.4 M12 16.8h.01',
  refresh: 'M20 11a8 8 0 0 0-14.3-4.9L4 8 M4 4v4h4 M4 13a8 8 0 0 0 14.3 4.9L20 16 M20 20v-4h-4',
  download: 'M12 4v11 M7 10l5 5 5-5 M5 20h14',
  arrowUpRight: 'M7 17 17 7 M8 7h9v9',
  arrowRight: 'M5 12h14 M13 6l6 6-6 6',
  check: 'M20 6 9 17l-5-5',
  users: 'M9 8m-3.5 0a3.5 3.5 0 1 0 7 0a3.5 3.5 0 1 0-7 0 M2.5 20a6.5 6.5 0 0 1 13 0 M16 4.6a3.5 3.5 0 0 1 0 6.8 M18.5 14.3a6.5 6.5 0 0 1 3 5.7',
  clock: 'M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0-18 0 M12 7v5l3 2',
  sparkles: 'M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z',
  panelLeft: 'M4 4h16v16H4z M9.5 4v16',
  info: 'M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0-18 0 M12 16v-4 M12 8h.01',
  alert: 'M12 9v4 M12 17h.01 M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z',
  alertCircle: 'M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0-18 0 M12 8v4 M12 16h.01',
  calendar: 'M4 6h16v15H4z M4 10h16 M8 3v4 M16 3v4',
  target: 'M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0-18 0 M12 12m-5 0a5 5 0 1 0 10 0a5 5 0 1 0-10 0 M12 12m-1 0a1 1 0 1 0 2 0a1 1 0 1 0-2 0',
  database: 'M12 5m-8 0a8 3 0 1 0 16 0a8 3 0 1 0-16 0 M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5 M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3',
  shield: 'M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6z M9 12l2 2 4-4',
  filter: 'M4 5h16l-6 7.5V19l-4 2v-8.5z',
  table: 'M4 5h16v14H4z M4 10h16 M4 14.5h16 M10 5v14',
  chart: 'M4 20V10 M10 20V4 M16 20v-7 M3 20h18',
  eye: 'M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z M12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0-6 0',
  eyeOff:
    'M3 3l18 18 M10.6 5.1A10.9 10.9 0 0 1 12 5c6.4 0 10 7 10 7a17.6 17.6 0 0 1-3.2 4.1 M6.6 6.6A17.4 17.4 0 0 0 2 12s3.6 7 10 7a9.7 9.7 0 0 0 5.4-1.6 M9.9 9.9a3 3 0 0 0 4.2 4.2',
  list: 'M9 6h11 M9 12h11 M9 18h11 M4.5 6h.01 M4.5 12h.01 M4.5 18h.01',
  share: 'M18 5m-3 0a3 3 0 1 0 6 0a3 3 0 1 0-6 0 M6 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0-6 0 M18 19m-3 0a3 3 0 1 0 6 0a3 3 0 1 0-6 0 M8.6 13.5l6.8 4 M15.4 6.5l-6.8 4',
  link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1 M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
} as const;

export type IconName = keyof typeof PATHS;

interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  name: IconName;
  size?: number;
  strokeWidth?: number;
}

export function Icon({ name, size = 18, strokeWidth = 1.8, className, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
      {...rest}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
