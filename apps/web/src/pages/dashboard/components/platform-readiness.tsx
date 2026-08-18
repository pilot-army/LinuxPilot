import {
  CheckIcon,
  DatabasesIcon,
  ErrorIcon,
  InfoIcon,
  MonitoringIcon,
  ServersIcon,
  ShieldIcon,
  WarningIcon,
} from '../../../features/dashboard/icons';
import { interpolate } from '../../../features/dashboard/format';
import type {
  SystemStatusSnapshot,
  SystemTone,
  WidgetResult,
} from '../../../features/dashboard/types';
import { useI18n } from '../../../i18n';
import { Button } from '../../../shared/ui/button';
import styles from '../dashboard-page.module.css';

type PlatformReadinessProps = {
  result: WidgetResult<SystemStatusSnapshot>;
  serversError: boolean;
  loading?: boolean;
  onRetry: () => void;
  onRetryServers: () => void;
};

const STATUS_ICONS: Record<SystemTone, typeof CheckIcon> = {
  ok: CheckIcon,
  warning: WarningIcon,
  error: ErrorIcon,
  info: InfoIcon,
};

const LEAD_ICONS: Record<SystemStatusSnapshot['checks'][number]['id'], typeof ShieldIcon> = {
  api: ShieldIcon,
  database: DatabasesIcon,
  gateway: ServersIcon,
  agents: MonitoringIcon,
};

export function PlatformReadiness({
  result,
  serversError,
  loading = false,
  onRetry,
  onRetryServers,
}: PlatformReadinessProps) {
  const { messages } = useI18n();
  const copy = messages.dashboard.readiness;
  const data = result.data;
  const checks = data?.checks ?? [];
  const healthError = result.status === 'error';
  const allReady = Boolean(data && data.requiredReady === data.requiredTotal);
  const showSkeleton = (loading || result.status === 'empty') && !data;

  return (
    <section
      className={`${styles.panel} ${styles.readinessPanel}`}
      aria-labelledby="platform-readiness-title"
      data-testid="platform-readiness"
    >
      <div className={styles.panelHead}>
        <h2 id="platform-readiness-title">{copy.title}</h2>
        {data ? (
          <p className={allReady ? styles.readyBadge : styles.mutedBadge}>
            {interpolate(copy.badge, { ready: data.requiredReady, total: data.requiredTotal })}
          </p>
        ) : (
          <p className={styles.mutedBadge}>{copy.unknown}</p>
        )}
      </div>
      {showSkeleton ? (
        <div className={styles.readinessList} aria-busy="true">
          <span className={`${styles.bone} ${styles.boneLine}`} />
          <span className={`${styles.bone} ${styles.boneLine}`} />
          <span className={`${styles.bone} ${styles.boneLine}`} />
        </div>
      ) : (
        <ul className={styles.readinessList}>
          {checks
            .filter((check) => check.id !== 'agents')
            .map((check) => {
              const Lead = LEAD_ICONS[check.id];
              const Status = STATUS_ICONS[check.tone];
              return (
                <li
                  key={check.id}
                  className={styles.readinessRow}
                  data-testid={`readiness-${check.id}`}
                >
                  <span className={`${styles.readinessLead} ${styles[`tone-${check.tone}`]}`}>
                    <Lead />
                  </span>
                  <span className={styles.readinessName}>{labelFor(check.id, copy)}</span>
                  <span className={`${styles.readinessStatus} ${styles[`tone-${check.tone}`]}`}>
                    <span className={styles.statusDot} aria-hidden="true" />
                    {valueFor(check.id, check.tone, data, copy, serversError)}
                  </span>
                  <span className={`${styles.readinessTrail} ${styles[`tone-${check.tone}`]}`}>
                    <Status />
                  </span>
                </li>
              );
            })}
        </ul>
      )}
      {healthError ? (
        <div className={styles.inlineWarning} role="status" data-testid="platform-health-warning">
          <WarningIcon />
          <p>{messages.dashboard.system.errorTitle}</p>
          <Button
            variant="ghost"
            className={styles.inlineButton}
            onClick={onRetry}
            data-testid="retry-health"
          >
            {messages.dashboard.actions.retry}
          </Button>
        </div>
      ) : null}
      {serversError ? (
        <div className={styles.inlineWarning} role="status" data-testid="servers-list-warning">
          <WarningIcon />
          <p>{copy.serversError}</p>
          <Button
            variant="ghost"
            className={styles.inlineButton}
            onClick={onRetryServers}
            data-testid="retry-servers"
          >
            {messages.dashboard.actions.retryServers}
          </Button>
        </div>
      ) : null}
    </section>
  );
}

function labelFor(
  id: SystemStatusSnapshot['checks'][number]['id'],
  copy: {
    api: string;
    database: string;
    gateway: string;
    agents: string;
  },
) {
  return copy[id];
}

function valueFor(
  id: SystemStatusSnapshot['checks'][number]['id'],
  tone: SystemTone,
  data: SystemStatusSnapshot | null | undefined,
  copy: {
    working: string;
    degraded: string;
    unavailable: string;
    unknown: string;
    loading: string;
    agentsValue: string;
  },
  serversError: boolean,
) {
  if (id === 'agents') {
    if (serversError || data?.agentsConnected == null) {
      return copy.unknown;
    }
    return interpolate(copy.agentsValue, { count: data.agentsConnected });
  }
  if (tone === 'ok') {
    return copy.working;
  }
  if (tone === 'warning') {
    return copy.degraded;
  }
  if (tone === 'error') {
    return copy.unavailable;
  }
  return copy.loading;
}
