import { QueryClient } from '@tanstack/react-query';
import { ApiError } from './api';

/**
 * Un 401 significa que la sesión del admin caducó. Se centraliza aquí el redirect para
 * que ninguna pantalla del panel tenga que acordarse de manejarlo.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        retry: (failureCount, error) => {
          if (error instanceof ApiError && error.status < 500) return false;
          return failureCount < 2;
        },
      },
    },
  });
}

/**
 * Detecta una sesion caducada. No navega: la navegacion la hace el componente que tiene
 * el router, para no acoplar este modulo al enrutador ni forzar una recarga completa.
 */
export function isSessionExpired(error: unknown): boolean {
  return error instanceof ApiError && error.isUnauthorized;
}
