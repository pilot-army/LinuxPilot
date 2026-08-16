import { useI18n } from '../../i18n';
import styles from './system-status.module.css';

export function SystemStatus() {
  const { messages } = useI18n();

  return (
    <p className={styles.status} role="status">
      <span className={styles.dot} aria-hidden="true" />
      <span>{messages.auth.status.label}</span>
    </p>
  );
}
