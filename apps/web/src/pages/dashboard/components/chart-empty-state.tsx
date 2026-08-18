import { ChartIcon } from '../../../features/dashboard/icons';
import { useI18n } from '../../../i18n';
import styles from '../dashboard-page.module.css';

export function ChartEmptyState() {
  const { messages } = useI18n();
  const copy = messages.dashboard.chart;

  return (
    <div className={styles.chartEmptyState} data-testid="dashboard-chart-empty">
      <div className={styles.chartEmptyCopy}>
        <ChartIcon className={styles.chartEmptyIcon} />
        <p className={styles.emptyTitle}>{copy.emptyTitle}</p>
        <p className={styles.emptyBody}>{copy.emptyBody}</p>
      </div>
    </div>
  );
}
