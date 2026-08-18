import {
  CpuIcon,
  MonitoringIcon,
  ServersIcon,
  WarningIcon,
} from '../../../features/dashboard/icons';
import { formatCompactPercent, interpolate } from '../../../features/dashboard/format';
import type { DashboardSummary as Summary } from '../../../features/dashboard/types';
import { useI18n } from '../../../i18n';
import { SummaryCard } from './summary-card';
import styles from '../dashboard-page.module.css';

type DashboardSummaryProps = {
  summary: Summary;
};

export function DashboardSummary({ summary }: DashboardSummaryProps) {
  const { messages } = useI18n();
  const copy = messages.dashboard.summary;
  const onlineEmpty = summary.total > 0 && summary.online === 0;

  return (
    <section
      className={styles.summaryGrid}
      aria-label={messages.dashboard.title}
      data-testid="dashboard-summary"
    >
      <SummaryCard
        title={copy.total}
        value={String(summary.total)}
        hint={copy.totalHint}
        accent="blue"
        icon={<ServersIcon />}
      />
      <SummaryCard
        title={copy.online}
        value={interpolate(copy.onlineValue, { online: summary.online, total: summary.total })}
        hint={
          onlineEmpty
            ? copy.onlineEmpty
            : interpolate(copy.onlineHint, { percent: summary.onlinePercent })
        }
        meter={summary.total > 0 ? summary.onlinePercent : null}
        accent={onlineEmpty ? 'danger' : 'success'}
        icon={<MonitoringIcon />}
      />
      <SummaryCard
        title={copy.attention}
        value={String(summary.attentionCount)}
        hint={summary.attentionCount > 0 ? copy.attentionHint : copy.attentionNone}
        meter={summary.total > 0 ? (summary.attentionCount / summary.total) * 100 : null}
        accent={summary.attentionCount > 0 ? 'danger' : 'success'}
        icon={<WarningIcon />}
      />
      <SummaryCard
        title={copy.load}
        value={formatCompactPercent(summary.averageCpu)}
        hint={summary.averageCpu === null ? copy.loadEmpty : copy.loadHint}
        meter={summary.averageCpu}
        accent="cyan"
        icon={<CpuIcon />}
      />
    </section>
  );
}
