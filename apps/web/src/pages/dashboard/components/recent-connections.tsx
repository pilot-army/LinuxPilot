import { interpolate, formatLastSeen } from '../../../features/dashboard/format';
import type { RecentConnection, WidgetResult } from '../../../features/dashboard/types';
import { useI18n } from '../../../i18n';
import { DashboardEmptyState } from './dashboard-empty-state';
import styles from '../dashboard-page.module.css';

type RecentConnectionsProps = {
  result: WidgetResult<RecentConnection[]>;
};

export function RecentConnections({ result }: RecentConnectionsProps) {
  const { messages } = useI18n();
  const copy = messages.dashboard.connections;
  const items = result.data ?? [];

  return (
    <section className={styles.panel} data-testid="dashboard-connections">
      <div className={styles.panelHead}>
        <h2>{copy.title}</h2>
      </div>
      {items.length === 0 ? (
        <DashboardEmptyState title={copy.empty} />
      ) : (
        <ul className={styles.connectionList}>
          {items.map((item) => (
            <li key={item.id}>
              <span className={styles.avatarMini} aria-hidden="true">
                {(item.actor === 'system' ? copy.system : item.actor).slice(0, 1).toUpperCase()}
              </span>
              <div>
                <p>
                  {interpolate(copy.item, {
                    user: item.actor === 'system' ? copy.system : item.actor,
                    server: item.serverName,
                  })}
                </p>
                <small>{formatLastSeen(item.createdAt, messages.dashboard.time)}</small>
              </div>
              <span className={`${styles.statusDot} ${styles.dotOk}`} aria-hidden="true" />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
