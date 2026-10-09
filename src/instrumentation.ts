import { DEFAULT_ADMIN_TOKEN } from './server/env';

/**
 * Corre una vez al arrancar cada instancia del servidor, antes de atender solicitudes.
 *
 * Avisa mientras el token del panel siga siendo el valor inicial: es predecible, y un token
 * compartido no da trazabilidad por persona ni permite revocar el acceso de alguien sin
 * afectar a los demás. Hay que rotarlo antes de exponer datos reales.
 */
export function register() {
  if (process.env.ADMIN_ACCESS_TOKEN === DEFAULT_ADMIN_TOKEN) {
    console.warn(
      'ADMIN_ACCESS_TOKEN sigue siendo el valor inicial. Rótelo por una cadena aleatoria ' +
        'larga antes de exponer datos reales.',
    );
  }
}
