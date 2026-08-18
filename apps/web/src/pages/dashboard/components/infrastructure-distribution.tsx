import type { DashboardServer } from '../../../features/dashboard/types';
import { computeInfrastructureDistribution } from '../../../features/dashboard/compute';
import { useI18n } from '../../../i18n';
import styles from '../dashboard-page.module.css';

type InfrastructureDistributionProps = {
  servers: DashboardServer[];
};

const ENV_TONES = ['#35d5f2', '#7ea0d4', '#50d890', '#f1bf4b', '#a78bfa'];

export function InfrastructureDistribution({ servers }: InfrastructureDistributionProps) {
  const { messages } = useI18n();
  const copy = messages.dashboard.distribution;
  const data = computeInfrastructureDistribution(servers);
  const total = Math.max(servers.length, 1);

  return (
    <section className={styles.panel} data-testid="dashboard-distribution">
      <div className={styles.panelHead}>
        <h2>{copy.title}</h2>
      </div>
      <div className={styles.distGrid}>
        <DistributionColumn
          title={copy.bySpace ?? copy.byEnvironment}
          items={(data.spaces ?? data.environments).map((item) => ({
            id: item.id,
            label: labelFor(item.id === 'unassigned' ? 'unassigned' : item.id, {
              ...copy,
              unassigned: copy.unassigned ?? copy.ungrouped,
            }),
            count: item.count,
          }))}
          total={total}
        />
        <DistributionColumn
          title={copy.byOs}
          items={data.operatingSystems.map((item) => ({
            id: item.id,
            label: labelFor(item.id, copy),
            count: item.count,
          }))}
          total={total}
        />
        <DistributionColumn
          title={copy.byAgent}
          items={data.agents.map((item) => ({
            id: item.id,
            label: labelFor(item.id, copy),
            count: item.count,
          }))}
          total={total}
        />
      </div>
    </section>
  );
}

function DistributionColumn({
  title,
  items,
  total,
}: {
  title: string;
  items: Array<{ id: string; label: string; count: number }>;
  total: number;
}) {
  return (
    <div>
      <p className={styles.distTitle}>{title}</p>
      <ul className={styles.distList}>
        {items.map((item, index) => (
          <li key={item.id}>
            <span
              className={styles.legendDot}
              style={{ background: ENV_TONES[index % ENV_TONES.length] }}
            />
            <span className={styles.distName}>{item.label}</span>
            <span className={styles.distBar} aria-hidden="true">
              <span style={{ width: `${Math.round((item.count / total) * 100)}%` }} />
            </span>
            <strong>{item.count}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}

function labelFor(id: string, copy: object): string {
  const value = (copy as Record<string, unknown>)[id];
  return typeof value === 'string' ? value : id;
}
