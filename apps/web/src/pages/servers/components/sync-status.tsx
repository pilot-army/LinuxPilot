import { formatSyncedAt } from '../../../features/servers/format';
import { useI18n } from '../../../i18n';
import styles from '../server-section.module.css';

type SyncStatusProps = {
  lastSuccessfulAt: string | null;
  refreshing?: boolean;
  failed?: boolean;
  testId?: string;
};

export function SyncStatus({ lastSuccessfulAt, refreshing, failed, testId }: SyncStatusProps) {
  const { messages } = useI18n();
  const copy = messages.servers.list;
  const label = refreshing
    ? copy.syncing
    : failed && !lastSuccessfulAt
      ? copy.syncedFailed
      : formatSyncedAt(lastSuccessfulAt, {
          justNow: copy.syncedJustNow,
          minutesAgo: copy.syncedMinutesAgo,
          never: copy.syncedNever,
        });
  const tone = refreshing
    ? styles.syncedBusy
    : failed && !lastSuccessfulAt
      ? styles.syncedFailed
      : lastSuccessfulAt
        ? styles.syncedFresh
        : '';

  return (
    <p className={styles.synced} data-testid={testId}>
      <span className={`${styles.syncedDot} ${tone}`} aria-hidden="true" />
      {label}
    </p>
  );
}
