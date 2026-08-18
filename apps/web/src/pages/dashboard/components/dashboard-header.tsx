import { fleetHealthTone, greetingPeriod } from '../../../features/dashboard/compute';
import { interpolate } from '../../../features/dashboard/format';
import { RefreshIcon } from '../../../features/dashboard/icons';
import type {
  ChartPeriod,
  DashboardMode,
  DashboardServer,
} from '../../../features/dashboard/types';
import { CHART_PERIODS } from '../../../features/dashboard/types';
import { useAuth } from '../../../auth/AuthProvider';
import { useI18n } from '../../../i18n';
import { Button } from '../../../shared/ui/button';
import styles from '../dashboard-page.module.css';

type DashboardHeaderProps = {
  mode: DashboardMode;
  refreshing: boolean;
  period: ChartPeriod;
  servers?: DashboardServer[];
  onRefresh: () => void;
  onPeriodChange: (period: ChartPeriod) => void;
};

export function DashboardHeader({
  mode,
  refreshing,
  period,
  servers = [],
  onRefresh,
  onPeriodChange,
}: DashboardHeaderProps) {
  const { user } = useAuth();
  const { messages } = useI18n();
  const empty = mode === 'onboarding';
  const name = user?.username || '—';
  const greeting = interpolate(messages.dashboard.greeting[greetingPeriod()], { name });
  const tone = empty ? 'ok' : fleetHealthTone(servers);
  const statusText = empty
    ? messages.dashboard.greeting.welcome
    : tone === 'ok'
      ? messages.dashboard.greeting.stable
      : messages.dashboard.greeting.attention;

  return (
    <div className={styles.pageHeader}>
      <div className={styles.pageHeading}>
        <h1>{messages.dashboard.title}</h1>
        <p data-testid="dashboard-greeting">
          {empty ? (
            <>
              <span className={styles.spark} aria-hidden="true">
                ✦
              </span>{' '}
              {statusText}
            </>
          ) : (
            `${greeting} ${statusText}`
          )}
        </p>
      </div>
      <div className={styles.pageActions}>
        {refreshing ? (
          <span className={styles.syncHint} data-testid="dashboard-syncing">
            {messages.dashboard.states.refreshing}
          </span>
        ) : null}
        <label className={styles.periodSelect}>
          <span className="sr-only">{messages.dashboard.chart.periodLabel}</span>
          <select
            value={period}
            onChange={(event) => onPeriodChange(event.target.value as ChartPeriod)}
            data-testid="dashboard-period"
            aria-label={messages.dashboard.chart.periodLabel}
          >
            {CHART_PERIODS.map((value) => (
              <option key={value} value={value}>
                {interpolate(messages.dashboard.chart.periodLast, {
                  period: messages.dashboard.chart.periods[value],
                })}
              </option>
            ))}
          </select>
        </label>
        <Button
          variant="ghost"
          className={styles.refreshButton}
          onClick={onRefresh}
          loading={refreshing}
          disabled={refreshing}
          data-testid="dashboard-refresh"
          aria-label={
            refreshing ? messages.dashboard.actions.refreshing : messages.dashboard.actions.refresh
          }
        >
          <RefreshIcon className={styles.buttonIcon} />
        </Button>
      </div>
    </div>
  );
}
