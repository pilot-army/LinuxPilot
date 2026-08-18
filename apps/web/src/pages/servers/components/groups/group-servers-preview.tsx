import { Link } from 'react-router-dom';
import type { ServerSummary } from '@linuxpilot/server-contracts';
import { ServersIcon } from '../../../../features/dashboard/icons';
import { formatPercent } from '../../../../features/servers/format';
import { useI18n } from '../../../../i18n';
import { Button } from '../../../../shared/ui/button';
import styles from '../../server-groups-page.module.css';

type GroupServersPreviewProps = {
  groupId: string;
  servers: ServerSummary[];
  canManage: boolean;
  onAssign: () => void;
  onRemove: (server: ServerSummary) => void;
};

export function GroupServersPreview({
  groupId,
  servers,
  canManage,
  onAssign,
  onRemove,
}: GroupServersPreviewProps) {
  const { messages } = useI18n();
  const copy = messages.servers.groups;

  if (servers.length === 0) {
    return (
      <section data-testid="group-servers-empty">
        <h3>{copy.servers}</h3>
        <p>{copy.emptyGroup}</p>
        {canManage ? (
          <Button variant="secondary" onClick={onAssign}>
            {copy.addServers}
          </Button>
        ) : null}
      </section>
    );
  }

  return (
    <section>
      <h3>{copy.servers}</h3>
      <ul>
        {servers.slice(0, 5).map((server) => (
          <li
            key={server.id}
            className={styles.serverRow}
            data-testid={`group-server-${server.id}`}
          >
            <div className={styles.cardMain}>
              <ServersIcon className={styles.serverGlyph} />
              <div>
                <strong>{server.name}</strong>
                <small>{server.primaryIp || '—'}</small>
              </div>
            </div>
            <div>
              <span className={`${styles.tag} ${styles[`seg-${statusTone(server.status)}`]}`}>
                {messages.servers.status[server.status]}
              </span>
              <span>{formatPercent(server.cpuUsagePercent)}</span>
              {canManage ? (
                <Button variant="ghost" onClick={() => onRemove(server)}>
                  {copy.removeFromGroup}
                </Button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
      <Link
        to={`/servers?spaceId=${groupId}`}
        className={styles.detailsLink}
        data-testid="view-group-servers"
      >
        {copy.viewAll} →
      </Link>
    </section>
  );
}

function statusTone(status: string) {
  if (status === 'ONLINE') return 'online';
  if (status === 'DEGRADED') return 'warning';
  if (status === 'OFFLINE' || status === 'REVOKED') return 'offline';
  return 'unknown';
}
