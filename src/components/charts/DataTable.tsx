import type { ReactNode } from 'react';
import clsx from 'clsx';

export interface Column<T> {
  key: string;
  header: ReactNode;
  render: (row: T) => ReactNode;
  align?: 'left' | 'right' | 'center';
  /** Ancho mínimo o clases propias de la columna. */
  className?: string;
}

/**
 * La vista de tabla de un gráfico: el mismo dato, celda por celda.
 *
 * Es el equivalente accesible de cada gráfico —lo que lee un lector de pantalla y lo que
 * se copia a una hoja de cálculo— y por eso es una tabla real, con encabezados de columna
 * y de fila. Las cifras van en `tabular-nums` porque aquí sí se alinean en columna.
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  caption,
  minWidth = 560,
  rowClassName,
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  caption: string;
  minWidth?: number;
  rowClassName?: (row: T) => string | undefined;
}) {
  return (
    <div className="relative -mx-1 overflow-x-auto px-1">
      <table className="w-full border-collapse text-sm" style={{ minWidth }}>
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-border-subtle">
            {columns.map((column, index) => (
              <th
                key={column.key}
                scope="col"
                className={clsx(
                  'py-2.5 pr-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-foreground-subtle last:pr-0',
                  alignClass(column.align ?? (index === 0 ? 'left' : 'right')),
                  column.className,
                )}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={rowKey(row)}
              className={clsx('border-b border-border-subtle last:border-b-0', rowClassName?.(row))}
            >
              {columns.map((column, index) => {
                const align = column.align ?? (index === 0 ? 'left' : 'right');
                const Cell = index === 0 ? 'th' : 'td';
                return (
                  <Cell
                    key={column.key}
                    scope={index === 0 ? 'row' : undefined}
                    className={clsx(
                      'py-2.5 pr-3 last:pr-0',
                      index === 0 ? 'font-normal text-foreground' : 'text-foreground-muted',
                      align === 'right' && 'tabular-nums',
                      alignClass(align),
                      column.className,
                    )}
                  >
                    {column.render(row)}
                  </Cell>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function alignClass(align: 'left' | 'right' | 'center') {
  return align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left';
}
