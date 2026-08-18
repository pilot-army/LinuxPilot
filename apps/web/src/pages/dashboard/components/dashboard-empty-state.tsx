import type { ReactNode } from 'react';
import styles from '../dashboard-page.module.css';

type DashboardEmptyStateProps = {
  title: string;
  body?: string;
  action?: ReactNode;
};

export function DashboardEmptyState({ title, body, action }: DashboardEmptyStateProps) {
  return (
    <div className={styles.emptyState}>
      <p className={styles.emptyTitle}>{title}</p>
      {body ? <p className={styles.emptyBody}>{body}</p> : null}
      {action}
    </div>
  );
}
