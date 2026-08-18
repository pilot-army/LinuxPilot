import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckIcon, ErrorIcon, InfoIcon, WarningIcon } from '../../../features/dashboard/icons';
import { filterActivityEvents } from '../../../features/dashboard/compute';
import { formatActivityTime } from '../../../features/dashboard/format';
import {
  ACTIVITY_FILTERS,
  type ActivityEvent,
  type ActivityFilter,
  type ActivityType,
  type WidgetResult,
} from '../../../features/dashboard/types';
import { useI18n } from '../../../i18n';
import { DashboardEmptyState } from './dashboard-empty-state';
import { DashboardErrorState } from './dashboard-error-state';
import styles from '../dashboard-page.module.css';

type RecentActivityProps = {
  result: WidgetResult<ActivityEvent[]>;
  onRetry: () => void;
};

const ICONS: Record<ActivityType, typeof CheckIcon> = {
  success: CheckIcon,
  information: InfoIcon,
  warning: WarningIcon,
  error: ErrorIcon,
};

export function RecentActivity({ result, onRetry }: RecentActivityProps) {
  const { locale, messages } = useI18n();
  const copy = messages.dashboard.activity;
  const actions = copy.actions as Record<string, string>;
  const [filter, setFilter] = useState<ActivityFilter>('all');
  const events = useMemo(
    () => filterActivityEvents(result.data ?? [], filter),
    [result.data, filter],
  );

  return (
    <section
      className={styles.panel}
      aria-labelledby="dashboard-activity-title"
      data-testid="dashboard-activity"
    >
      <div className={styles.panelHead}>
        <h2 id="dashboard-activity-title">{copy.title}</h2>
        <div className={styles.panelHeadActions}>
          <label className={styles.activityFilter}>
            <span className="sr-only">{copy.filterLabel}</span>
            <select
              value={filter}
              onChange={(event) => setFilter(event.target.value as ActivityFilter)}
              data-testid="dashboard-activity-filter"
            >
              {ACTIVITY_FILTERS.map((value) => (
                <option key={value} value={value}>
                  {copy.filters[value]}
                </option>
              ))}
            </select>
          </label>
        </div>
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
      {result.status === 'empty' || (result.status === 'success' && events.length === 0) ? (
        <DashboardEmptyState title={copy.emptyTitle} body={copy.emptyBody} />
      ) : null}
      {result.status === 'success' && events.length > 0 ? (
        <ul className={styles.activityList}>
          {events.map((event) => {
            const Icon = ICONS[event.type];
            return (
              <li key={event.id} className={styles.activityItem}>
                <span
                  className={`${styles.activityIcon} ${styles[`tone-${event.type}`]}`}
                  aria-hidden="true"
                >
                  <Icon />
                </span>
                <div className={styles.activityCopy}>
                  <p>{actions[event.action] ?? actions.unknown}</p>
                  <small title={event.serverName}>{event.serverName}</small>
                </div>
                <time className={styles.activityTime} dateTime={event.createdAt}>
                  {formatActivityTime(event.createdAt, locale)}
                </time>
              </li>
            );
          })}
        </ul>
      ) : null}
      <Link to="/servers" className={styles.panelFooter} data-testid="dashboard-view-events">
        {messages.dashboard.actions.viewAllEvents}
      </Link>
    </section>
  );
}
