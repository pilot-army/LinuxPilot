import { formatCompactPercent } from '../../../features/dashboard/format';
import type { DashboardSummary } from '../../../features/dashboard/types';
import { useI18n } from '../../../i18n';
import styles from '../dashboard-page.module.css';

type ResourceUsageProps = {
  summary: DashboardSummary;
};

export function ResourceUsage({ summary }: ResourceUsageProps) {
  const { messages } = useI18n();
  const copy = messages.dashboard.resources;
  const items = [
    { id: 'cpu', label: copy.cpu, value: summary.averageCpu },
    { id: 'ram', label: copy.ram, value: summary.averageRam },
    { id: 'disk', label: copy.disk, value: summary.averageDisk },
  ];
  const hasData = items.some((item) => item.value !== null);

  return (
    <section
      className={styles.panel}
      aria-labelledby="dashboard-resources-title"
      data-testid="dashboard-resources"
    >
      <div className={styles.panelHead}>
        <h2 id="dashboard-resources-title">{copy.title}</h2>
      </div>
      {hasData ? (
        <ul className={styles.resourceList}>
          {items.map((item) => (
            <li key={item.id} className={styles.resourceRow}>
              <div className={styles.resourceMeta}>
                <span>{item.label}</span>
                <strong>{formatCompactPercent(item.value)}</strong>
              </div>
              <div className={styles.resourceTrack} aria-hidden="true">
                <span
                  className={styles.resourceFill}
                  style={{ width: `${item.value === null ? 0 : Math.min(100, item.value)}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.emptyBody}>{copy.empty}</p>
      )}
    </section>
  );
}
