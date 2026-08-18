import { Link } from 'react-router-dom';
import { CheckIcon, ErrorIcon, InfoIcon, WarningIcon } from '../../../features/dashboard/icons';
import { interpolate } from '../../../features/dashboard/format';
import type {
  SystemStatusSnapshot,
  SystemTone,
  WidgetResult,
} from '../../../features/dashboard/types';
import { useI18n } from '../../../i18n';
import { DashboardEmptyState } from './dashboard-empty-state';
import { DashboardErrorState } from './dashboard-error-state';
import styles from '../dashboard-page.module.css';

type PlatformStatusProps = {
  result: WidgetResult<SystemStatusSnapshot>;
  onRetry: () => void;
};

const ICONS: Record<SystemTone, typeof CheckIcon> = {
  ok: CheckIcon,
  warning: WarningIcon,
  error: ErrorIcon,
  info: InfoIcon,
};

export function PlatformStatus({ result, onRetry }: PlatformStatusProps) {
  const { messages } = useI18n();
  const copy = messages.dashboard.system;
  const data = result.data;

  return (
    <section
      className={styles.panel}
      aria-labelledby="dashboard-system-title"
      data-testid="dashboard-system"
    >
      <div className={styles.panelHead}>
        <h2 id="dashboard-system-title">{copy.title}</h2>
        <Link to="/servers" className={styles.textLink}>
          {messages.dashboard.actions.viewAll}
        </Link>
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
      {result.status === 'empty' ? <DashboardEmptyState title={copy.emptyTitle} /> : null}
      {result.status === 'success' && data ? (
        <ul className={styles.systemList}>
          {data.checks.map((check) => {
            const Icon = ICONS[check.tone];
            return (
              <li key={check.id} className={styles.systemItem}>
                <span>{labelFor(check.id, data, copy)}</span>
                <span className={`${styles.systemValue} ${styles[`tone-${check.tone}`]}`}>
                  <Icon />
                  {valueFor(check.id, check.tone, data, copy)}
                </span>
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}

function labelFor(
  id: SystemStatusSnapshot['checks'][number]['id'],
  data: SystemStatusSnapshot,
  copy: {
    api: string;
    database: string;
    gateway: string;
    agents: string;
  },
) {
  if (id === 'agents') {
    if (data.agentsConnected == null || data.agentsTotal == null) {
      return interpolate(copy.agents, { connected: '—', total: '—' });
    }
    return interpolate(copy.agents, { connected: data.agentsConnected, total: data.agentsTotal });
  }
  return copy[id];
}

function valueFor(
  id: SystemStatusSnapshot['checks'][number]['id'],
  tone: SystemTone,
  data: SystemStatusSnapshot,
  copy: {
    ok: string;
    error: string;
    warning: string;
    noData: string;
  },
) {
  if (id === 'agents') {
    if (data.agentsConnected == null || data.agentsTotal == null) {
      return copy.noData;
    }
    return data.agentsTotal === 0
      ? '0%'
      : `${Math.round((data.agentsConnected / data.agentsTotal) * 100)}%`;
  }
  if (tone === 'ok') {
    return copy.ok;
  }
  if (tone === 'error') {
    return copy.error;
  }
  if (tone === 'warning') {
    return copy.warning;
  }
  return copy.noData;
}
