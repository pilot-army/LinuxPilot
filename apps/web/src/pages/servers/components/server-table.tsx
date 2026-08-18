import type { ServerSummary } from '@linuxpilot/server-contracts';
import { interpolate } from '../../../features/servers/format';
import type { ListSort } from '../../../features/servers/types';
import { useI18n } from '../../../i18n';
import { ServerTableRow } from './server-table-row';
import styles from '../servers-page.module.css';

type ServerTableProps = {
  items: ServerSummary[];
  selectedIds: string[];
  activeId: string;
  canDelete: boolean;
  canUpdate: boolean;
  canTerminal: boolean;
  sort: ListSort;
  order: 'asc' | 'desc';
  onSort: (sort: ListSort) => void;
  onToggle: (id: string) => void;
  onToggleAll: () => void;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  onRevoke: (id: string) => void;
};

export function ServerTable({
  items,
  selectedIds,
  activeId,
  canDelete,
  canUpdate,
  canTerminal,
  sort,
  order,
  onSort,
  onToggle,
  onToggleAll,
  onOpen,
  onDelete,
  onRevoke,
}: ServerTableProps) {
  const { messages } = useI18n();
  const copy = messages.servers.list;
  const allSelected = items.length > 0 && items.every((server) => selectedIds.includes(server.id));

  function ariaSort(column: ListSort): 'ascending' | 'descending' | 'none' {
    if (sort !== column) {
      return 'none';
    }
    return order === 'asc' ? 'ascending' : 'descending';
  }

  function header(column: ListSort, label: string) {
    const active = sort === column;
    return (
      <button
        type="button"
        className={styles.sortButton}
        onClick={() => onSort(column)}
        aria-label={`${interpolate(copy.sortBy, { column: label })}${
          active ? `, ${order === 'asc' ? copy.sortedAsc : copy.sortedDesc}` : ''
        }`}
      >
        {label}
        <span aria-hidden="true">{active ? (order === 'asc' ? ' ↑' : ' ↓') : ''}</span>
      </button>
    );
  }

  return (
    <div className={styles.tableWrap}>
      <table className={styles.table} data-testid="servers-table">
        <colgroup>
          <col className={styles.colCheck} />
          <col className={styles.colServer} />
          <col className={styles.colEnv} />
          <col className={styles.colStatus} />
          <col className={styles.colOs} />
          <col className={styles.colCpu} />
          <col className={styles.colRam} />
          <col className={styles.colDisk} />
          <col className={styles.colUptime} />
          <col className={styles.colActions} />
        </colgroup>
        <thead>
          <tr>
            <th>
              <input
                type="checkbox"
                checked={allSelected}
                onChange={onToggleAll}
                aria-label={copy.selectAll}
              />
            </th>
            <th aria-sort={ariaSort('name')}>{header('name', copy.columnsExtra.server)}</th>
            <th>{copy.columnsExtra.space ?? copy.columnsExtra.environment}</th>
            <th aria-sort={ariaSort('status')}>{header('status', copy.columns.status)}</th>
            <th className={styles.colOs}>{copy.columnsExtra.osAgent}</th>
            <th className={styles.colCpu}>{copy.columns.cpu}</th>
            <th className={styles.colRam}>{copy.columns.ram}</th>
            <th className={styles.colDisk}>{copy.columns.disk}</th>
            <th aria-sort={ariaSort('lastSeenAt')}>
              {header('lastSeenAt', copy.columnsExtra.uptimeLastSeen)}
            </th>
            <th>
              <span className="sr-only">{copy.columnsExtra.actions}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((server) => (
            <ServerTableRow
              key={server.id}
              server={server}
              selected={selectedIds.includes(server.id)}
              active={activeId === server.id}
              canDelete={canDelete}
              canUpdate={canUpdate}
              canTerminal={canTerminal}
              onToggle={() => onToggle(server.id)}
              onOpen={() => onOpen(server.id)}
              onDelete={() => onDelete(server.id)}
              onRevoke={() => onRevoke(server.id)}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
