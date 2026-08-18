import { Link } from 'react-router-dom';
import { formatLastSeen, interpolate } from '../../../features/dashboard/format';
import type { AttentionIssue, WidgetResult } from '../../../features/dashboard/types';
import { useI18n } from '../../../i18n';
import { DashboardEmptyState } from './dashboard-empty-state';
import styles from '../dashboard-page.module.css';

type AttentionRequiredProps = {
  result: WidgetResult<AttentionIssue[]>;
};

export function AttentionRequired({ result }: AttentionRequiredProps) {
  const { messages } = useI18n();
  const copy = messages.dashboard.issues;
  const items = result.data ?? [];

  return (
    <section className={styles.panel} data-testid="dashboard-attention">
      <div className={styles.panelHead}>
        <h2>{copy.title}</h2>
      </div>
      {items.length === 0 ? (
        <DashboardEmptyState title={copy.emptyTitle} body={copy.emptyBody} />
      ) : (
        <div className={styles.tableScroll}>
          <table className={styles.compactTable}>
            <thead>
              <tr>
                <th>{copy.server}</th>
                <th>{copy.problem}</th>
                <th>{copy.severityColumn}</th>
                <th>{copy.age}</th>
                <th>{copy.module}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <Link to={item.href} className={styles.serverLink}>
                      {item.serverName}
                    </Link>
                  </td>
                  <td>{copy.kinds[item.kind]}</td>
                  <td>
                    <span className={`${styles.severity} ${styles[`severity-${item.severity}`]}`}>
                      {copy.severity[item.severity]}
                    </span>
                  </td>
                  <td>{formatLastSeen(item.createdAt, messages.dashboard.time)}</td>
                  <td>
                    <Link
                      to={item.href}
                      className={styles.textLink}
                      aria-label={interpolate(copy.open, { name: item.serverName })}
                    >
                      {copy.modules.servers} →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
