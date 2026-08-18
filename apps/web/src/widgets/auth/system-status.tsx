import { useI18n } from '../../i18n';
import styles from './system-status.module.css';

type SystemStatusProps = {
  status: 'loading' | 'success' | 'error';
  healthStatus?: string | null;
};

export function SystemStatus({ status, healthStatus }: SystemStatusProps) {
  const { messages } = useI18n();
  const tone =
    status === 'loading'
      ? 'info'
      : status === 'error' || !healthStatus
        ? 'error'
        : healthStatus === 'ok'
          ? 'ok'
          : 'warning';
  const label =
    status === 'loading'
      ? messages.auth.status.checking
      : status === 'error' || !healthStatus
        ? messages.auth.status.unavailable
        : healthStatus === 'ok'
          ? messages.auth.status.ok
          : messages.auth.status.degraded;

  return (
    <p className={styles.status} data-tone={tone} role="status" data-testid="system-status">
      <span className={styles.dot} aria-hidden="true" />
      <span>{label}</span>
    </p>
  );
}
