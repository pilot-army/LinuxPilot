import { PlusIcon, RefreshIcon } from '../../../../features/dashboard/icons';
import { formatSyncedAt } from '../../../../features/servers/format';
import { useI18n } from '../../../../i18n';
import { Button } from '../../../../shared/ui/button';
import styles from '../../server-groups-page.module.css';

type ServerGroupsHeaderProps = {
  lastSuccessfulAt: string | null;
  refreshing: boolean;
  canCreate: boolean;
  onRefresh: () => void;
  onCreate: () => void;
};

export function ServerGroupsHeader({
  lastSuccessfulAt,
  refreshing,
  canCreate,
  onRefresh,
  onCreate,
}: ServerGroupsHeaderProps) {
  const { messages } = useI18n();
  const copy = messages.servers.groups;
  const synced = formatSyncedAt(lastSuccessfulAt, {
    justNow: messages.servers.list.syncedJustNow,
    minutesAgo: messages.servers.list.syncedMinutesAgo,
    never: messages.servers.list.syncedNever,
  });

  return (
    <div className={styles.pageHeader}>
      <div className={styles.pageHeading}>
        <nav className={styles.breadcrumb} aria-label={messages.servers.nav}>
          <span>{messages.servers.nav}</span>
          <span aria-hidden="true"> / </span>
          <span>{copy.title}</span>
        </nav>
        <h1>{copy.title}</h1>
        <p>{copy.subtitle}</p>
      </div>
      <div className={styles.pageActions}>
        <p className={styles.synced} data-testid="groups-synced">
          <span className={`${styles.syncedDot} ${lastSuccessfulAt ? styles.syncedFresh : ''}`} />
          {synced}
        </p>
        <Button
          variant="ghost"
          className={styles.iconAction}
          onClick={onRefresh}
          loading={refreshing}
          disabled={refreshing}
          data-testid="groups-refresh"
          aria-label={refreshing ? messages.servers.list.refreshing : messages.servers.list.refresh}
        >
          <RefreshIcon />
        </Button>
        {canCreate ? (
          <Button onClick={onCreate} data-testid="create-group">
            <PlusIcon />
            {copy.create}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
