import type { SurveyPhase } from './survey-phases';

/**
 * Un trazo por bloque. Refuerzan el color sin depender de él, que es lo que necesita
 * quien no distingue el verde del ámbar: la forma también cambia al cambiar de bloque.
 */
const PATHS: Record<SurveyPhase['id'], string> = {
  // Tres nodos unidos: el mapa de relacionamiento que este bloque construye.
  relacionamiento:
    'M12 5m-2.4 0a2.4 2.4 0 1 0 4.8 0a2.4 2.4 0 1 0-4.8 0 M5 18m-2.4 0a2.4 2.4 0 1 0 4.8 0a2.4 2.4 0 1 0-4.8 0 M19 18m-2.4 0a2.4 2.4 0 1 0 4.8 0a2.4 2.4 0 1 0-4.8 0 M10.6 7 6.4 15.8 M13.4 7l4.2 8.8 M7.4 18h9.2',
  // Flujos de distinto largo con hitos: la operación y sus tiempos.
  operacion: 'M4 7h10 M4 12h16 M4 17h7 M18 7m-2.2 0a2.2 2.2 0 1 0 4.4 0a2.2 2.2 0 1 0-4.4 0 M14 17m-2.2 0a2.2 2.2 0 1 0 4.4 0a2.2 2.2 0 1 0-4.4 0',
  // Dos personas: cómo nos tratamos.
  cultura:
    'M9 8m-3 0a3 3 0 1 0 6 0a3 3 0 1 0-6 0 M3.5 19a5.5 5.5 0 0 1 11 0 M16 6.2a3 3 0 0 1 0 5.6 M18.2 15.6A5.5 5.5 0 0 1 20.5 19',
  // Una idea encendida: lo que habría que cambiar.
  cierre:
    'M12 3v2 M5 7.5 6.4 8.9 M19 7.5 17.6 8.9 M4 15h2 M18 15h2 M9.2 18.5h5.6 M10 21h4 M12 8a4.5 4.5 0 0 0-2.6 8.2h5.2A4.5 4.5 0 0 0 12 8Z',
};

export function PhaseIcon({
  phase,
  size = 20,
  className,
}: {
  phase: SurveyPhase;
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d={PATHS[phase.id]} />
    </svg>
  );
}

/** El visto que marca lo ya terminado. */
export function CheckIcon({ size = 14, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}
