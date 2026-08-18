import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { ServerGroup } from '@linuxpilot/server-contracts';
import { MoreIcon } from '../../../../features/dashboard/icons';
import { spacePath } from '../../../../features/groups/space-path';
import { formatLastSeen, formatPercent, interpolate } from '../../../../features/servers/format';
import { useI18n } from '../../../../i18n';
import styles from '../../server-groups-page.module.css';

type GroupsListProps = {
  items: ServerGroup[];
  selectedIds: string[];
  canManage: boolean;
  onToggle: (id: string) => void;
  onEdit: (id: string) => void;
  onAssign: (id: string) => void;
};

export function GroupsList({
  items,
  selectedIds,
  canManage,
  onToggle,
  onEdit,
  onAssign,
}: GroupsListProps) {
  const { messages } = useI18n();
  const copy = messages.servers.groups;

  return (
    <div className={styles.listWrap} data-testid="groups-list">
      <table className={styles.table}>
        <colgroup>
          <col className={styles.colCheck} />
          <col className={styles.colName} />
          <col className={styles.colDescription} />
          <col className={styles.colCount} />
          <col className={styles.colCount} />
          <col className={styles.colCount} />
          <col className={styles.colCount} />
          <col className={styles.colCount} />
          <col className={styles.colResources} />
          <col className={styles.colUpdated} />
          <col className={styles.colActions} />
        </colgroup>
        <thead>
          <tr>
            <th>
              <span className="sr-only">{copy.selectGroup}</span>
            </th>
            <th>{copy.columns.name}</th>
            <th>{copy.columns.description}</th>
            <th className={styles.numeric}>{copy.columns.servers}</th>
            <th className={styles.numeric}>{copy.columns.online}</th>
            <th className={styles.numeric}>{copy.columns.warning}</th>
            <th className={styles.numeric}>{copy.columns.offline}</th>
            <th className={styles.numeric}>{copy.columns.withoutAgent}</th>
            <th>{copy.columns.resources}</th>
            <th>{copy.columns.updated}</th>
            <th>
              <span className="sr-only">{messages.servers.list.actionsMenu}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((group) => {
            const selected = selectedIds.includes(group.id);
            return (
              <tr
                key={group.id}
                className={selected ? styles.rowSelected : undefined}
                aria-selected={selected}
                data-testid={`group-row-${group.id}`}
              >
                <td>
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => onToggle(group.id)}
                    aria-label={interpolate(copy.selectGroup, { name: group.name })}
                  />
                </td>
                <td>
                  <Link to={spacePath(group)}>{group.name}</Link>
                </td>
                <td>
                  <span className={styles.clamp}>{group.description || '—'}</span>
                </td>
                <td className={styles.numeric}>{group.serverCount}</td>
                <td className={styles.numeric}>{group.onlineCount}</td>
                <td className={styles.numeric}>{group.warningCount}</td>
                <td className={styles.numeric}>{group.offlineCount}</td>
                <td className={styles.numeric}>{group.withoutAgentCount}</td>
                <td className={styles.numeric}>
                  {formatPercent(group.averageCpuPercent)} /{' '}
                  {formatPercent(group.averageMemoryPercent)} /{' '}
                  {formatPercent(group.averageDiskPercent)}
                </td>
                <td>{formatLastSeen(group.updatedAt, messages.servers.list.time)}</td>
                <td>
                  <div className={styles.rowMenu}>
                    <RowMenu
                      group={group}
                      canManage={canManage}
                      onEdit={() => onEdit(group.id)}
                      onAssign={() => onAssign(group.id)}
                    />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function RowMenu({
  group,
  canManage,
  onEdit,
  onAssign,
}: {
  group: ServerGroup;
  canManage: boolean;
  onEdit: () => void;
  onAssign: () => void;
}) {
  const { messages } = useI18n();
  const copy = messages.servers.groups;
  const [open, setOpen] = useState(false);
  const href = spacePath(group);

  return (
    <div className={styles.menuWrap}>
      <button
        type="button"
        className={styles.iconAction}
        aria-label={copy.moreActions}
        aria-expanded={open}
        data-testid={`group-list-menu-${group.id}`}
        onClick={() => setOpen((value) => !value)}
      >
        <MoreIcon />
      </button>
      {open ? (
        <div className={styles.menuPopover} role="menu">
          <Link to={href} role="menuitem" onClick={() => setOpen(false)}>
            {copy.open}
          </Link>
          {canManage ? (
            <>
              <button
                type="button"
                data-testid={`group-list-assign-${group.id}`}
                onClick={() => {
                  setOpen(false);
                  onAssign();
                }}
              >
                {copy.addServers}
              </button>
              <button
                type="button"
                data-testid={`group-list-edit-${group.id}`}
                onClick={() => {
                  setOpen(false);
                  onEdit();
                }}
              >
                {copy.edit}
              </button>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
