import { Button } from '../../../shared/ui/button';
import styles from '../dashboard-page.module.css';

type DashboardErrorStateProps = {
  title: string;
  body?: string;
  retryLabel: string;
  onRetry: () => void;
  compact?: boolean;
  testId?: string;
};

export function DashboardErrorState({
  title,
  body,
  retryLabel,
  onRetry,
  compact = false,
  testId,
}: DashboardErrorStateProps) {
  return (
    <div className={compact ? styles.errorCompact : styles.errorState} role="alert">
      <p className={styles.errorTitle}>{title}</p>
      {body ? <p className={styles.errorBody}>{body}</p> : null}
      <Button
        variant="secondary"
        className={styles.inlineButton}
        onClick={onRetry}
        data-testid={testId}
      >
        {retryLabel}
      </Button>
    </div>
  );
}
