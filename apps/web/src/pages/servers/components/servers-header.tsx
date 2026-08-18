import { PlusIcon, RefreshIcon } from '../../../features/dashboard/icons';
import { formatSyncedAt } from '../../../features/servers/format';
import { useI18n } from '../../../i18n';
import { Button } from '../../../shared/ui/button';
import styles from '../servers-page.module.css';

type ServersHeaderProps = {
  lastSuccessfulAt: string | null;
  refreshing: boolean;
  canCreate: boolean;
  onRefresh: () => void;
};

export function ServersHeader({
  lastSuccessfulAt,
  refreshing,
  canCreate,
  onRefresh,
}: ServersHeaderProps) {
  const { messages } = useI18n();
  const copy = messages.servers.list;
  const synced = formatSyncedAt(lastSuccessfulAt, {
    justNow: copy.syncedJustNow,
    minutesAgo: copy.syncedMinutesAgo,
    never: copy.syncedNever,
  });

  return (
    <div className={styles.pageHeader}>
      <div className={styles.pageHeading}>
        <nav className={styles.breadcrumb} aria-label={messages.navigation.items.home}>
          <span>{messages.navigation.items.home}</span>
          <span aria-hidden="true"> / </span>
          <span>{copy.title}</span>
        </nav>
        <h1>{copy.title}</h1>
        <p>{copy.subtitle}</p>
      </div>
      <div className={styles.pageActions}>
        <p className={styles.synced} data-testid="servers-synced">
          <span className={`${styles.syncedDot} ${lastSuccessfulAt ? styles.syncedFresh : ''}`} />
          {synced}
        </p>
        <Button
          variant="ghost"
          className={styles.iconAction}
          onClick={onRefresh}
          loading={refreshing}
          disabled={refreshing}
          data-testid="servers-refresh"
          aria-label={refreshing ? copy.refreshing : copy.refresh}
        >
          <RefreshIcon />
        </Button>
        {canCreate ? (
          <button type="button" className={styles.addLink} data-testid="add-server">
            <PlusIcon />
            {copy.add}
          </button>
        ) : null}
      </div>
    </div>
  );
}
