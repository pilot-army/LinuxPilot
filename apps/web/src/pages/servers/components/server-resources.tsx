import { formatPercent } from '../../../features/servers/format';
import { metricTone } from '../../../features/servers/compute';
import { useI18n } from '../../../i18n';
import styles from '../servers-page.module.css';

type ServerResourcesProps = {
  cpu: number | null;
  ram: number | null;
  disk: number | null;
  compact?: boolean;
};

export function ServerResources({ cpu, ram, disk, compact = false }: ServerResourcesProps) {
  const { messages } = useI18n();
  const items = [
    { id: 'cpu', label: messages.servers.list.columns.cpu, value: cpu },
    { id: 'ram', label: messages.servers.list.columns.ram, value: ram },
    { id: 'disk', label: messages.servers.list.columns.disk, value: disk },
  ];

  return (
    <div className={compact ? styles.resourceRow : styles.resourceStack}>
      {items.map((item) => {
        const tone = metricTone(item.value);
        return (
          <div key={item.id} className={styles.meter}>
            <div className={styles.meterHead}>
              <span>{item.label}</span>
              <strong className={styles[`tone-${tone}`]}>{formatPercent(item.value)}</strong>
            </div>
            {item.value === null ? null : (
              <div className={styles.meterTrack} aria-hidden="true">
                <span
                  className={`${styles.meterFill} ${styles[`fill-${tone}`]}`}
                  style={{ width: `${Math.min(100, item.value)}%` }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
