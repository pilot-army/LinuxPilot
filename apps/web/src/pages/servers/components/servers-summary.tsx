import type { ServerSummary } from '@linuxpilot/server-contracts';
import {
  availabilityPercent,
  averageCpuPercent,
  outdatedAgentCount,
} from '../../../features/servers/compute';
import {
  formatAvailability,
  formatPercentCompact,
  interpolate,
} from '../../../features/servers/format';
import type { ServerCounts } from '../../../features/servers/types';
import { useI18n } from '../../../i18n';
import styles from '../servers-page.module.css';

type ServersSummaryProps = {
  counts: ServerCounts;
  items?: ServerSummary[];
};

export function ServersSummary({ counts, items = [] }: ServersSummaryProps) {
  const { messages } = useI18n();
  const copy = messages.servers.list.summary;
  const totalLabel =
    counts.all === 1 ? copy.totalOne : interpolate(copy.total, { count: counts.all });
  const availability = availabilityPercent(counts);
  const avgCpu = averageCpuPercent(items);
  const updates = outdatedAgentCount(items);
  const segments = [
    { id: 'online', value: counts.online, className: styles.segOnline, label: copy.online },
    { id: 'warning', value: counts.warning, className: styles.segWarning, label: copy.warning },
    { id: 'offline', value: counts.offline, className: styles.segOffline, label: copy.offline },
    { id: 'noAgent', value: counts.noAgent, className: styles.segNoAgent, label: copy.noAgent },
  ];

  return (
    <section className={styles.summaryBar} aria-label={totalLabel} data-testid="servers-summary">
      <div className={styles.summaryFleet}>
        <p className={styles.summaryTotal}>{totalLabel}</p>
        <div className={styles.statusTrack} aria-label={copy.statusBar} role="img">
          {segments.map((segment) =>
            segment.value > 0 ? (
              <span
                key={segment.id}
                className={`${styles.statusSeg} ${segment.className}`}
                style={{ flexGrow: segment.value, flexBasis: 0 }}
                title={`${segment.label}: ${segment.value}`}
              />
            ) : null,
          )}
          {counts.all === 0 ? <span className={styles.statusSeg} style={{ flex: 1 }} /> : null}
        </div>
        <ul className={styles.summaryLegend}>
          {segments.map((segment) => (
            <li key={segment.id}>
              <span className={`${styles.legendDot} ${segment.className}`} aria-hidden="true" />
              <span>
                {segment.label}: {segment.value}
              </span>
            </li>
          ))}
        </ul>
        <span className="sr-only">
          {segments.map((segment) => `${segment.label} ${segment.value}`).join(', ')}
        </span>
      </div>
      <div className={styles.summaryStats}>
        <article className={styles.summaryStat}>
          <p>
            {interpolate(copy.availability, {
              percent: availability === null ? '—' : formatAvailability(availability),
            })}
          </p>
        </article>
        <article className={styles.summaryStat} title={copy.avgCpuHint}>
          <p>
            {avgCpu === null
              ? copy.avgCpuEmpty
              : interpolate(copy.avgCpu, { percent: formatPercentCompact(avgCpu) })}
          </p>
        </article>
        <article className={styles.summaryStat} title={copy.updatesHint}>
          <p>{interpolate(copy.updates, { count: updates })}</p>
        </article>
      </div>
    </section>
  );
}
