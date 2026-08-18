import { interpolate } from '../../../features/dashboard/format';
import type { DashboardSummary, LoadPoint } from '../../../features/dashboard/types';
import { useI18n } from '../../../i18n';
import styles from '../dashboard-page.module.css';

type ServerOverviewProps = {
  summary: DashboardSummary;
  heartbeat: LoadPoint[];
  periodLabel: string;
};

export function ServerOverview({ summary, heartbeat, periodLabel }: ServerOverviewProps) {
  const { messages } = useI18n();
  const copy = messages.dashboard.fleet;
  const totalLabel =
    summary.total === 1 ? copy.totalOne : interpolate(copy.total, { count: summary.total });
  const slices = [
    { id: 'online', value: summary.online, color: 'var(--color-success)', label: copy.online },
    { id: 'offline', value: summary.offline, color: 'var(--color-danger)', label: copy.offline },
    { id: 'warning', value: summary.warning, color: 'var(--color-warning)', label: copy.warning },
    {
      id: 'waiting',
      value: summary.waitingAgent,
      color: 'var(--color-info)',
      label: copy.waitingAgent,
    },
  ];

  return (
    <section className={`${styles.panel} ${styles.fleetPanel}`} data-testid="dashboard-summary">
      <div className={styles.panelHead}>
        <h2>{copy.title}</h2>
      </div>
      <div className={styles.fleetGrid}>
        <div className={styles.donutWrap}>
          <Donut
            slices={slices}
            total={summary.total}
            label={totalLabel}
            ariaLabel={copy.chartLabel}
          />
        </div>
        <ul className={styles.fleetLegend}>
          {slices.map((slice) => (
            <li key={slice.id}>
              <span className={styles.legendDot} style={{ background: slice.color }} />
              <span>{slice.label}</span>
              <strong>{slice.value}</strong>
            </li>
          ))}
        </ul>
        <div className={styles.fleetAvail}>
          <p className={styles.mutedLabel}>
            {interpolate(copy.availabilityPeriod, { period: periodLabel })}
          </p>
          <p className={styles.availValue}>
            {summary.total > 0 ? `${summary.availabilityPercent.toFixed(2)}%` : '—'}
          </p>
          <p className={styles.mutedLabel}>{copy.heartbeat}</p>
          {heartbeat.length > 1 ? (
            <Sparkline
              values={heartbeat.map((point) => point.cpuPercent)}
              label={copy.heartbeatHint}
            />
          ) : (
            <p className={styles.emptyBody}>{messages.dashboard.resources.noHistory}</p>
          )}
        </div>
      </div>
    </section>
  );
}

function Donut({
  slices,
  total,
  label,
  ariaLabel,
}: {
  slices: Array<{ id: string; value: number; color: string; label: string }>;
  total: number;
  label: string;
  ariaLabel: string;
}) {
  const radius = 52;
  const stroke = 12;
  const circ = 2 * Math.PI * radius;
  let offset = 0;
  const safeTotal = Math.max(
    total,
    slices.reduce((sum, slice) => sum + slice.value, 0),
    1,
  );

  return (
    <div className={styles.donut}>
      <svg viewBox="0 0 140 140" role="img" aria-label={`${ariaLabel}. ${label}`}>
        <circle
          cx="70"
          cy="70"
          r={radius}
          fill="none"
          stroke="rgba(139, 170, 220, 0.12)"
          strokeWidth={stroke}
        />
        {slices.map((slice) => {
          const length = (slice.value / safeTotal) * circ;
          const node = (
            <circle
              key={slice.id}
              cx="70"
              cy="70"
              r={radius}
              fill="none"
              stroke={slice.color}
              strokeWidth={stroke}
              strokeDasharray={`${length} ${circ - length}`}
              strokeDashoffset={-offset}
              strokeLinecap="butt"
              transform="rotate(-90 70 70)"
            />
          );
          offset += length;
          return node;
        })}
      </svg>
      <div className={styles.donutLabel}>
        <strong>{total}</strong>
        <span>{label.replace(String(total), '').trim() || label}</span>
      </div>
    </div>
  );
}

export function Sparkline({ values, label }: { values: Array<number | null>; label: string }) {
  const numbers = values.filter((value): value is number => value !== null);
  if (numbers.length < 2) {
    return null;
  }
  const max = Math.max(...numbers, 1);
  const min = Math.min(...numbers, 0);
  const span = Math.max(max - min, 1);
  const width = 160;
  const height = 36;
  const d = numbers
    .map((value, index) => {
      const x = (index / (numbers.length - 1)) * width;
      const y = height - ((value - min) / span) * (height - 4) - 2;
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <svg
      className={styles.sparkline}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={label}
    >
      <path d={d} fill="none" stroke="var(--color-primary)" strokeWidth="1.8" />
    </svg>
  );
}
