import type { ServerSummary } from '@linuxpilot/server-contracts';
import { CheckIcon, FolderIcon } from '../../../../features/dashboard/icons';
import { useUngroupedServers } from '../../../../features/groups/use-ungrouped-servers';
import { interpolate } from '../../../../features/servers/format';
import { useI18n } from '../../../../i18n';
import { Button } from '../../../../shared/ui/button';
import styles from '../../server-groups-page.module.css';
import spaceStyles from '../../server-spaces-page.module.css';

type UngroupedServersNoticeProps = {
  count: number;
  canManage: boolean;
  revision?: string | null;
  selectedIds: string[];
  onToggle: (id: string) => void;
  onDistribute: () => void;
  onMove: (server: ServerSummary) => void;
};

export function UngroupedServersNotice({
  count,
  canManage,
  revision,
  selectedIds,
  onToggle,
  onDistribute,
  onMove,
}: UngroupedServersNoticeProps) {
  const { messages } = useI18n();
  const copy = messages.servers.groups;
  const servers = useUngroupedServers(count, revision);

  if (count <= 0) {
    return (
      <aside className={spaceStyles.sideCard} data-testid="ungrouped-notice">
        <div className={styles.cardMain}>
          <span className={styles.folder} aria-hidden="true">
            <CheckIcon />
          </span>
          <div>
            <h3>{copy.ungroupedTitle}</h3>
            <p>{copy.ungroupedAllAssigned}</p>
          </div>
        </div>
      </aside>
    );
  }

  return (
    <aside className={spaceStyles.sideCard} data-testid="ungrouped-notice">
      <div className={styles.cardMain}>
        <span className={styles.folder} aria-hidden="true">
          <FolderIcon />
        </span>
        <div>
          <h3>{copy.ungroupedTitle}</h3>
          <p>{count === 1 ? copy.ungroupedBodyOne : interpolate(copy.ungroupedBody, { count })}</p>
        </div>
      </div>
      {servers.length > 0 ? (
        <ul className={spaceStyles.unassignedList}>
          {servers.slice(0, 8).map((server) => (
            <li key={server.id} className={spaceStyles.unassignedItem}>
              <input
                type="checkbox"
                checked={selectedIds.includes(server.id)}
                onChange={() => onToggle(server.id)}
                aria-label={server.name}
              />
              <span>
                <strong>{server.name}</strong>
                <small>{server.primaryIp || server.hostname || '—'}</small>
              </span>
              <span className={`${styles.tag} ${styles[`seg-${statusTone(server.status)}`]}`}>
                {messages.servers.status[server.status]}
              </span>
              {canManage ? (
                <Button variant="ghost" onClick={() => onMove(server)}>
                  {copy.moveToSpace}
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
      {canManage ? (
        <Button variant="secondary" onClick={onDistribute} data-testid="distribute-servers">
          {copy.distribute}
        </Button>
      ) : null}
    </aside>
  );
}

function statusTone(status: string) {
  if (status === 'ONLINE') return 'online';
  if (status === 'DEGRADED') return 'warning';
  if (status === 'OFFLINE' || status === 'REVOKED') return 'offline';
  return 'unknown';
}
