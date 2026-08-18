import { CheckIcon } from '../../../../../features/dashboard/icons';
import type { ConnectionOutcome, TimelineItem } from '../../../../../features/enrollment/types';
import { useI18n } from '../../../../../i18n';
import { Button } from '../../../../../shared/ui/button';
import styles from '../enrollment-wizard.module.css';

type ConnectionVerificationStepProps = {
  items: TimelineItem[];
  outcome: ConnectionOutcome;
  status: string;
  onOpenServer: () => void;
  onGoOverview: () => void;
  onRetry: () => void;
};

const LABELS = {
  created: 'timelineCreated',
  token: 'timelineToken',
  waiting: 'timelineWaiting',
  connected: 'timelineConnected',
  heartbeat: 'timelineHeartbeat',
  metrics: 'timelineMetrics',
} as const;

export function ConnectionVerificationStep({
  items,
  outcome,
  status,
  onOpenServer,
  onGoOverview,
  onRetry,
}: ConnectionVerificationStepProps) {
  const { messages } = useI18n();
  const copy = messages.servers.create;
  const success = outcome === 'connected' || outcome === 'metrics';

  return (
    <section data-testid="enrollment-wait" aria-live="polite">
      {success ? (
        <div className={styles.success}>
          <span className={styles.successIcon} aria-hidden="true">
            <CheckIcon />
          </span>
          <p className={styles.successTitle}>{copy.onlineTitle}</p>
          <div className={styles.successActions}>
            <Button block={false} data-testid="open-server" onClick={onOpenServer}>
              {copy.openServer}
            </Button>
            <Button variant="secondary" block={false} onClick={onGoOverview}>
              {copy.goOverview}
            </Button>
          </div>
        </div>
      ) : null}
      <ol className={styles.timeline}>
        {items.map((item) => (
          <li key={item.id}>
            <span className={`${styles.dot} ${styles[`dot-${item.state}`]}`} aria-hidden="true" />
            <span>{copy[LABELS[item.id]]}</span>
          </li>
        ))}
      </ol>
      <p data-testid="enrollment-status">{status}</p>
      {outcome === 'timeout' ? <p role="status">{copy.timeout}</p> : null}
      {outcome === 'expired' ? <p role="status">{copy.tokenExpired}</p> : null}
      {outcome === 'error' ? (
        <p role="alert">
          {copy.genericError}{' '}
          <Button variant="ghost" size="sm" block={false} onClick={onRetry}>
            {copy.retry}
          </Button>
        </p>
      ) : null}
    </section>
  );
}
