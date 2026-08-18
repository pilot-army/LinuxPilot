import { RefreshIcon } from '../../../features/dashboard/icons';
import { useI18n } from '../../../i18n';
import { Button } from '../../../shared/ui/button';
import styles from '../server-section.module.css';

type RefreshButtonProps = {
  refreshing: boolean;
  onRefresh: () => void;
  testId?: string;
};

export function RefreshButton({ refreshing, onRefresh, testId }: RefreshButtonProps) {
  const { messages } = useI18n();
  const copy = messages.servers.list;
  return (
    <Button
      variant="ghost"
      size="sm"
      className={styles.iconAction}
      onClick={onRefresh}
      loading={refreshing}
      disabled={refreshing}
      data-testid={testId}
      aria-label={refreshing ? copy.syncing : copy.refresh}
    >
      <RefreshIcon />
    </Button>
  );
}
