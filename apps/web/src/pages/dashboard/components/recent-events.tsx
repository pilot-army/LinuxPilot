import { Link } from 'react-router-dom';
import { PERMISSIONS } from '@linuxpilot/auth-contracts';
import { usePermission } from '../../../auth/use-permission';
import { CalendarIcon, ExternalIcon } from '../../../features/dashboard/icons';
import type { ActivityEvent, WidgetResult } from '../../../features/dashboard/types';
import { useI18n } from '../../../i18n';
import { DashboardErrorState } from './dashboard-error-state';
import styles from '../dashboard-page.module.css';

type RecentEventsProps = {
  result: WidgetResult<ActivityEvent[]>;
  onRetry: () => void;
};

export function RecentEvents({ result, onRetry }: RecentEventsProps) {
  const { messages } = useI18n();
  const copy = messages.dashboard.events;
  const canAudit = usePermission(PERMISSIONS.AUDIT_VIEW);
  const events = result.data ?? [];
  const logAvailable = canAudit && result.status !== 'error';

  return (
    <section
      className={`${styles.panel} ${styles.recentEvents}`}
      aria-labelledby="recent-events-title"
      data-testid="recent-events"
    >
      <div className={styles.panelHead}>
        <h2 id="recent-events-title">{copy.title}</h2>
        {logAvailable ? (
          <Link to="/server-audit" className={styles.textLink}>
            {copy.viewLog}
            <ExternalIcon />
          </Link>
        ) : (
          <span className={`${styles.textLink} ${styles.linkDisabled}`}>
            {copy.viewLog}
            <ExternalIcon />
          </span>
        )}
      </div>
      {result.status === 'error' ? (
        <DashboardErrorState
          title={copy.errorTitle}
          body={copy.errorBody}
          retryLabel={messages.dashboard.actions.retry}
          onRetry={onRetry}
          compact
        />
      ) : null}
      {result.status !== 'error' && events.length === 0 ? (
        <div className={styles.eventsEmpty} data-testid="recent-events-empty">
          <CalendarIcon className={styles.emptyGlyph} />
          <p className={styles.emptyBody}>{copy.empty}</p>
        </div>
      ) : null}
      {result.status === 'success' && events.length > 0 ? (
        <ul className={styles.activityList}>
          {events.slice(0, 4).map((event) => (
            <li key={event.id} className={styles.activityItem}>
              <div className={styles.activityCopy}>
                <p>
                  {(messages.dashboard.activity.actions as Record<string, string>)[event.action] ??
                    messages.dashboard.activity.actions.unknown}
                </p>
                <small>{event.serverName}</small>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
