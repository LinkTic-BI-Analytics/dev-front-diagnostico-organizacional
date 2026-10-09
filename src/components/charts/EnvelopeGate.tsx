import type { ReactNode } from 'react';
import type { Envelope } from '@/lib/admin.types';
import { Icon } from '@/components/ui/icons';
import { InsufficientData } from './InsufficientData';

/**
 * Resuelve el envoltorio analítico en un solo lugar.
 *
 * Centralizarlo garantiza que ninguna pantalla pueda olvidarse de honrar la regla de
 * anonimato y pintar un gráfico con un corte demasiado pequeño.
 */
export function EnvelopeGate<T>({
  query,
  children,
  loading,
}: {
  query: { data?: Envelope<T>; isLoading: boolean; error: unknown };
  children: (data: T, meta: Envelope<T>['meta']) => ReactNode;
  /** Lo que ocupa el lugar mientras llega el dato. Por defecto, una tarjeta en reposo. */
  loading?: ReactNode;
}) {
  if (query.isLoading) return <>{loading ?? <LoadingCard />}</>;

  if (query.error || !query.data) return <ErrorCard />;

  const { data, meta } = query.data;
  if (meta.insufficient || data === null) {
    return <InsufficientData n={meta.n} minCohortSize={meta.minCohortSize} />;
  }

  return <>{children(data, meta)}</>;
}

/**
 * El lugar del dato mientras llega: la forma de una tarjeta, quieta. Solo en la primera
 * carga; al refrescar se conserva lo que ya estaba pintado, sin parpadeo.
 */
export function LoadingCard({ height = 220 }: { height?: number }) {
  return (
    <div
      role="status"
      className="lk-tarjeta flex flex-col gap-4 p-6"
      style={{ minHeight: height }}
    >
      <span className="sr-only">Cargando…</span>
      <span aria-hidden className="h-4 w-2/5 animate-pulse rounded-full bg-surface-muted" />
      <span aria-hidden className="h-3 w-3/5 animate-pulse rounded-full bg-surface-muted" />
      <span aria-hidden className="mt-auto h-24 w-full animate-pulse rounded-xl bg-surface-sunken" />
    </div>
  );
}

export function ErrorCard({ message }: { message?: string }) {
  return (
    <div role="alert" className="lk-tarjeta flex items-start gap-3 p-6">
      <Icon name="alertCircle" size={20} className="mt-0.5 shrink-0 text-danger" />
      <div className="flex flex-col gap-1">
        <p className="text-sm font-semibold text-foreground">
          {message ?? 'No pudimos cargar esta información.'}
        </p>
        <p className="text-[13px] text-foreground-muted">
          Puede ser la conexión o que la sesión haya vencido. Recargue la página; si persiste,
          vuelva a ingresar.
        </p>
      </div>
    </div>
  );
}
