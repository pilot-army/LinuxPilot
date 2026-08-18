import type { GatewayHealth } from '../../api/health';
import styles from './system-terminal.module.css';

const NAME_COLUMN_WIDTH = 16;

function statusClass(status: string) {
  if (status === 'ok') {
    return styles.ok;
  }
  if (status === 'degraded') {
    return styles.degraded;
  }
  return styles.unavailable;
}

type SystemTerminalProps = {
  status: 'loading' | 'success' | 'error';
  health: GatewayHealth | null;
};

export function SystemTerminal({ status, health }: SystemTerminalProps) {
  const session = health?.service ? `linuxpilot@${health.service}` : 'linuxpilot';
  const rows =
    status === 'success' && health
      ? [
          { name: health.service || 'api-gateway', status: health.status },
          { name: 'auth-service', status: health.dependencies?.authService ?? 'unknown' },
          { name: 'server-service', status: health.dependencies?.serverService ?? 'unknown' },
        ]
      : [];

  return (
    <div className={styles.terminal} aria-hidden="true" data-testid="system-terminal">
      <div className={styles.titlebar}>
        <span className={styles.controls}>
          <span className={styles.control} />
          <span className={styles.control} />
          <span className={styles.control} />
        </span>
        <span className={styles.session}>{session}: ~</span>
      </div>
      <pre className={styles.body}>
        <div className={styles.command}>$ GET /health</div>
        {status === 'loading' ? <div className={styles.row}>checking…</div> : null}
        {status === 'error' ? <div className={styles.row}>unavailable</div> : null}
        {rows.map((service) => (
          <div key={service.name} className={styles.row}>
            <span className={`${styles.bullet} ${statusClass(service.status)}`}>●</span>
            <span className={styles.name}>{service.name.padEnd(NAME_COLUMN_WIDTH)}</span>
            <span className={statusClass(service.status)}>{service.status}</span>
          </div>
        ))}
        <span className={styles.cursor} />
      </pre>
    </div>
  );
}
