import type { ReactNode } from 'react';
import styles from '../server-section.module.css';

type Column<T> = {
  id: string;
  header: ReactNode;
  hidden?: boolean;
  className?: string;
  cell: (row: T) => ReactNode;
};

type DataTableProps<T extends { id: string }> = {
  columns: Column<T>[];
  rows: T[];
  activeId?: string;
  selectedIds?: string[];
  testId?: string;
  ariaLabel?: string;
  onRowOpen?: (id: string) => void;
};

export function DataTable<T extends { id: string }>({
  columns,
  rows,
  activeId,
  selectedIds = [],
  testId,
  ariaLabel,
  onRowOpen,
}: DataTableProps<T>) {
  const visible = columns.filter((column) => !column.hidden);
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table} data-testid={testId} aria-label={ariaLabel}>
        <thead>
          <tr>
            {visible.map((column) => (
              <th key={column.id} className={column.className}>
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              className={`${selectedIds.includes(row.id) ? styles.rowSelected : ''} ${activeId === row.id ? styles.rowActive : ''}`}
              aria-selected={activeId === row.id || selectedIds.includes(row.id)}
              data-testid={`${testId}-row-${row.id}`}
              onClick={() => onRowOpen?.(row.id)}
            >
              {visible.map((column) => (
                <td key={column.id} className={column.className}>
                  {column.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
