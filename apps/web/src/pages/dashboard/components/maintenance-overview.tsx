import { Link } from 'react-router-dom';
import { interpolate } from '../../../features/dashboard/format';
import { OperationsIcon, PowerIcon } from '../../../features/dashboard/icons';
import type { DashboardSummary } from '../../../features/dashboard/types';
import { useI18n } from '../../../i18n';
import styles from '../dashboard-page.module.css';

type MaintenanceOverviewProps = {
  summary: DashboardSummary;
  pendingOperations: number | null;
};

export function MaintenanceOverview({ summary, pendingOperations }: MaintenanceOverviewProps) {
  const { messages } = useI18n();
  const copy = messages.dashboard.maintenance;
  const modeLabel =
    summary.maintenanceCount === 1
      ? copy.modeValueOne
      : interpolate(copy.modeValue, { count: summary.maintenanceCount });
  const opsLabel =
    pendingOperations === null
      ? copy.unavailable
      : pendingOperations === 1
        ? copy.operationsValueOne
        : interpolate(copy.operationsValue, { count: pendingOperations });

  return (
    <section className={styles.panel} data-testid="dashboard-maintenance">
      <div className={styles.panelHead}>
        <h2>{copy.title}</h2>
      </div>
      <div className={styles.maintGrid}>
        <Link to="/servers?maintenance=true" className={styles.maintCard}>
          <PowerIcon />
          <span>{copy.mode}</span>
          <strong>{modeLabel}</strong>
        </Link>
        <Link to="/server-operations" className={styles.maintCard}>
          <OperationsIcon />
          <span>{copy.operations}</span>
          <strong>{opsLabel}</strong>
        </Link>
      </div>
    </section>
  );
}
