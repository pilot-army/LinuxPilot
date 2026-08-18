import { interpolate } from '../../../features/dashboard/format';
import {
  formatBytesPair,
  formatCompactPercent,
  formatCoresPair,
} from '../../../features/dashboard/format';
import { CpuIcon, DiskIcon, MemoryIcon, NetworkIcon } from '../../../features/dashboard/icons';
import type { DashboardSummary, LoadPoint } from '../../../features/dashboard/types';
import { useI18n } from '../../../i18n';
import { Sparkline } from './server-overview';
import styles from '../dashboard-page.module.css';

type AggregateResourcesProps = {
  summary: DashboardSummary;
  history: LoadPoint[];
};

export function AggregateResources({ summary, history }: AggregateResourcesProps) {
  const { messages } = useI18n();
  const copy = messages.dashboard.resources;
  const cpuSpark = history.map((point) => point.cpuPercent);
  const ramSpark = history.map((point) => point.ramPercent);
  const rows = [
    {
      id: 'cpu',
      icon: CpuIcon,
      label: copy.cpu,
      percent: summary.averageCpu,
      detail: formatCoresPair(summary.cpuCoresUsed, summary.cpuCoresTotal),
      spark: cpuSpark,
    },
    {
      id: 'ram',
      icon: MemoryIcon,
      label: copy.ram,
      percent: summary.averageRam,
      detail: formatBytesPair(summary.memoryUsedBytes, summary.memoryTotalBytes),
      spark: ramSpark,
    },
    {
      id: 'disk',
      icon: DiskIcon,
      label: copy.disk,
      percent: summary.averageDisk,
      detail: formatBytesPair(summary.diskUsedBytes, summary.diskTotalBytes),
      spark: [] as Array<number | null>,
    },
    {
      id: 'net-in',
      icon: NetworkIcon,
      label: copy.networkIn,
      percent: null,
      detail: null,
      spark: [] as Array<number | null>,
    },
    {
      id: 'net-out',
      icon: NetworkIcon,
      label: copy.networkOut,
      percent: null,
      detail: null,
      spark: [] as Array<number | null>,
    },
  ];

  return (
    <section className={styles.panel} data-testid="dashboard-resources">
      <div className={styles.panelHead}>
        <h2>{copy.title}</h2>
      </div>
      <ul className={styles.resourceRows}>
        {rows.map((row) => {
          const Icon = row.icon;
          return (
            <li key={row.id} className={styles.resourceLine}>
              <span className={styles.resourceIcon} aria-hidden="true">
                <Icon />
              </span>
              <span className={styles.resourceName}>{row.label}</span>
              <strong>{formatCompactPercent(row.percent)}</strong>
              {row.spark.length > 1 ? (
                <Sparkline
                  values={row.spark}
                  label={interpolate(copy.sparkLabel, { name: row.label })}
                />
              ) : (
                <span className={styles.resourceEmpty}>{copy.noHistory}</span>
              )}
              <span className={styles.resourceDetail}>{row.detail ?? '—'}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
