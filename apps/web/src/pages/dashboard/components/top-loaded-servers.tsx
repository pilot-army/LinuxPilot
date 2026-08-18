import { Link } from 'react-router-dom';
import { selectTopLoadedServers, spaceKey } from '../../../features/dashboard/compute';
import { formatCompactPercent } from '../../../features/dashboard/format';
import type { DashboardServer } from '../../../features/dashboard/types';
import { useI18n } from '../../../i18n';
import styles from '../dashboard-page.module.css';

type TopLoadedServersProps = {
  servers: DashboardServer[];
};

export function TopLoadedServers({ servers }: TopLoadedServersProps) {
  const { messages } = useI18n();
  const copy = messages.dashboard.topLoaded;
  const dist = messages.dashboard.distribution;
  const rows = selectTopLoadedServers(servers);

  return (
    <section className={styles.panel} data-testid="dashboard-top-loaded">
      <div className={styles.panelHead}>
        <h2>{copy.title}</h2>
        <Link to="/servers" className={styles.textLink} data-testid="dashboard-open-servers">
          {copy.openAll} →
        </Link>
      </div>
      <div className={styles.tableScroll}>
        <table className={styles.compactTable}>
          <thead>
            <tr>
              <th>{copy.rank}</th>
              <th>{copy.server}</th>
              <th>{copy.space ?? copy.environment}</th>
              <th>{copy.status}</th>
              <th>{messages.dashboard.resources.cpu}</th>
              <th>{messages.dashboard.resources.ram}</th>
              <th>{messages.dashboard.resources.disk}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((server, index) => {
              const space = spaceKey(server);
              return (
                <tr key={server.id} data-testid={`dashboard-server-${server.id}`}>
                  <td>{index + 1}</td>
                  <td>
                    <Link to={`/servers/${server.id}`} className={styles.serverLink}>
                      {server.name}
                    </Link>
                  </td>
                  <td>{dist[space as keyof typeof dist] ?? space}</td>
                  <td>
                    <span className={`${styles.statusChip} ${styles[`status-${server.status}`]}`}>
                      <span className={styles.statusDot} aria-hidden="true" />
                      {messages.dashboard.status[server.status]}
                    </span>
                  </td>
                  <td>
                    <Meter value={server.cpuPercent} />
                  </td>
                  <td>
                    <Meter value={server.ramPercent} />
                  </td>
                  <td>
                    <Meter value={server.diskPercent} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Meter({ value }: { value: number | null }) {
  const width = value === null ? 0 : Math.min(100, Math.max(0, value));
  return (
    <div className={styles.meter}>
      <span>{formatCompactPercent(value)}</span>
      <span className={styles.meterTrack} aria-hidden="true">
        <span className={styles.meterFill} style={{ width: `${width}%` }} />
      </span>
    </div>
  );
}
