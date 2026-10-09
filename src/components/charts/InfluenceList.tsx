import Link from 'next/link';
import type { InfluenceNode, ThresholdBand } from '@/lib/admin.types';
import { ZONE_LABELS } from '@/lib/insights';
import { classify, formatIndex } from '@/lib/score-scale';
import { EmptyState } from './InsufficientData';

/**
 * Una lista corta de nodos de la red con su lectura: el número, la zona, cuánto mueve y
 * cuánto lo mueven, y el relacionamiento que recibe u otorga. Es la forma de las tarjetas
 * «Palancas» y «Síntomas» de la línea gráfica de referencia.
 */
export function InfluenceList({
  nodes,
  numbers,
  bands,
  score,
  hrefOf,
  emptyMessage,
}: {
  nodes: InfluenceNode[];
  numbers: Map<string, number>;
  bands: ThresholdBand[];
  /** Qué relacionamiento se muestra: el que recibe (palancas) o el que otorga (síntomas). */
  score: 'received' | 'granted';
  hrefOf?: (code: string) => string | undefined;
  emptyMessage: string;
}) {
  if (nodes.length === 0) return <EmptyState message={emptyMessage} />;

  return (
    <ul className="flex flex-col divide-y divide-border-subtle">
      {nodes.map((node) => {
        const value = score === 'received' ? node.irelReceived : node.irelGranted;
        const band = classify(value, bands);
        const href = hrefOf?.(node.code);
        const name = (
          <>
            <b className="font-semibold">#{numbers.get(node.code)}</b> {node.name}
          </>
        );
        return (
          <li key={node.code} className="flex flex-col gap-1.5 py-3 first:pt-0 last:pb-0">
            <p className="flex items-start gap-2 text-sm leading-snug text-foreground">
              <span
                aria-hidden
                className="mt-1.5 size-2 shrink-0 rounded-full"
                style={band ? { backgroundColor: band.color } : { boxShadow: 'inset 0 0 0 1.5px var(--chart-ink)' }}
              />
              {href ? (
                <Link href={href} className="hover:underline">
                  {name}
                </Link>
              ) : (
                <span>{name}</span>
              )}
            </p>
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 pl-4 text-[12.5px] text-foreground-muted">
              <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[12px] font-medium text-foreground">
                {ZONE_LABELS[node.zone]}
              </span>
              <span className="tabular-nums">
                mueve {node.motricidad} · la mueven {node.grantedBy > 0 ? node.dependencia : 'sin medir'}
              </span>
              <span className="tabular-nums">
                {score === 'received' ? 'recibe' : 'otorga'}{' '}
                {value !== null ? (
                  <>
                    <b className="font-semibold text-foreground">{formatIndex(value, 1)}</b>
                    {band && ` · ${band.label}`}
                  </>
                ) : (
                  'sin dato publicable'
                )}
              </span>
            </p>
          </li>
        );
      })}
    </ul>
  );
}
