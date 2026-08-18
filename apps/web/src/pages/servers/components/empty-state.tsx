import type { ReactNode } from 'react';
import { ErrorIcon, ServersIcon } from '../../../features/dashboard/icons';
import styles from '../server-section.module.css';

type EmptyStateProps = {
  icon?: ReactNode;
  title: string;
  body: string;
  action?: ReactNode;
  testId?: string;
};

export function EmptyState({ icon, title, body, action, testId }: EmptyStateProps) {
  return (
    <section className={styles.empty} data-testid={testId}>
      <span className={styles.stateIcon} aria-hidden="true">
        {icon ?? <ServersIcon />}
      </span>
      <h2>{title}</h2>
      <p>{body}</p>
      {action ? <div className={styles.stateActions}>{action}</div> : null}
    </section>
  );
}

export function FilteredEmptyState({ title, body, action, testId }: Omit<EmptyStateProps, 'icon'>) {
  return <EmptyState title={title} body={body} action={action} testId={testId} />;
}

type ErrorStateProps = {
  title: string;
  body: string;
  retryLabel: string;
  onRetry: () => void;
  secondary?: ReactNode;
  testId?: string;
};

export function ErrorState({
  title,
  body,
  retryLabel,
  onRetry,
  secondary,
  testId,
}: ErrorStateProps) {
  return (
    <section className={styles.error} role="alert" data-testid={testId}>
      <span className={styles.stateIcon} aria-hidden="true">
        <ErrorIcon />
      </span>
      <h2>{title}</h2>
      <p>{body}</p>
      <div className={styles.stateActions}>
        <button type="button" className={styles.primaryLink} onClick={onRetry}>
          {retryLabel}
        </button>
        {secondary}
      </div>
    </section>
  );
}

export function LoadingSkeleton({ testId }: { testId?: string }) {
  return (
    <div className={styles.skeleton} data-testid={testId} aria-hidden="true">
      <div className={styles.summaryRow}>
        <span className={styles.bone} />
        <span className={styles.bone} />
        <span className={styles.bone} />
        <span className={styles.bone} />
      </div>
      <span className={styles.boneWide} />
    </div>
  );
}
