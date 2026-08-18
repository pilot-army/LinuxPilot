import { Link } from 'react-router-dom';
import { WarningIcon } from '../../../features/dashboard/icons';
import { interpolate } from '../../../features/dashboard/format';
import { useI18n } from '../../../i18n';
import styles from '../dashboard-page.module.css';

type AgentWarningProps = {
  count: number;
};

export function AgentWarning({ count }: AgentWarningProps) {
  const { messages } = useI18n();
  if (count <= 0) {
    return null;
  }

  const title =
    count === 1
      ? messages.dashboard.incident.titleOne
      : interpolate(messages.dashboard.incident.title, { count });
  const body = count === 1 ? messages.dashboard.incident.bodyOne : messages.dashboard.incident.body;

  return (
    <section className={styles.incident} data-testid="dashboard-incident" aria-live="polite">
      <span className={styles.incidentIcon} aria-hidden="true">
        <WarningIcon />
      </span>
      <div className={styles.incidentCopy}>
        <h2>{title}</h2>
        <p>{body}</p>
      </div>
      <div className={styles.incidentActions}>
        <Link to="/servers" className={styles.incidentFix} data-testid="dashboard-incident-fix">
          {messages.dashboard.actions.inspect}
        </Link>
      </div>
    </section>
  );
}
