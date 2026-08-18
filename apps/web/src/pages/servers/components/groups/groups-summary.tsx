import type { ServerGroup } from '@linuxpilot/server-contracts';
import { useI18n } from '../../../../i18n';
import { Button } from '../../../../shared/ui/button';
import styles from '../../server-groups-page.module.css';

type GroupsSummaryProps = {
  items: ServerGroup[];
  unassignedCount: number;
  canManage: boolean;
  onDistribute: () => void;
};

export function GroupsSummary({
  items,
  unassignedCount,
  canManage,
  onDistribute,
}: GroupsSummaryProps) {
  const { messages } = useI18n();
  const copy = messages.servers.groups;
  const servers = items.reduce((sum, space) => sum + space.serverCount, 0) + unassignedCount;
  const online = items.reduce((sum, space) => sum + space.onlineCount, 0);

  return (
    <section
      className={styles.summary}
      aria-label={copy.spacesHeading}
      data-testid="spaces-summary"
    >
      <div className={styles.summaryCards}>
        <SummaryStat label={copy.summarySpaces} value={items.length} />
        <SummaryStat label={copy.summaryServers} value={servers} />
        <SummaryStat label={copy.summaryOnline} value={online} />
        <SummaryStat label={copy.summaryUnassigned} value={unassignedCount} />
      </div>
      {canManage && unassignedCount > 0 ? (
        <Button variant="secondary" onClick={onDistribute} data-testid="summary-distribute">
          {copy.distribute}
        </Button>
      ) : null}
    </section>
  );
}

function SummaryStat({ label, value }: { label: string; value: number }) {
  return (
    <div className={styles.summaryCard}>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}
