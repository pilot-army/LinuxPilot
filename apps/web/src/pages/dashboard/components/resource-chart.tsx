import { useId, useMemo, useState } from 'react';
import {
  CHART_PERIODS,
  type ChartPeriod,
  type LoadSeries,
  type WidgetResult,
} from '../../../features/dashboard/types';
import {
  formatChartTick,
  formatCompactPercent,
  formatLastSeen,
  interpolate,
  selectChartTicks,
} from '../../../features/dashboard/format';
import { useMediaQuery } from '../../../features/dashboard/use-media-query';
import { useI18n } from '../../../i18n';
import { ChartEmptyState } from './chart-empty-state';
import { DashboardErrorState } from './dashboard-error-state';
import styles from '../dashboard-page.module.css';

type ResourceChartProps = {
  result: WidgetResult<LoadSeries>;
  period: ChartPeriod;
  onPeriodChange: (period: ChartPeriod) => void;
  onRetry: () => void;
};

const WIDTH = 640;
const HEIGHT = 220;
const PADDING = { top: 12, right: 10, bottom: 26, left: 34 };

export function ResourceChart({ result, period, onPeriodChange, onRetry }: ResourceChartProps) {
  const { locale, messages } = useI18n();
  const copy = messages.dashboard.chart;
  const compact = useMediaQuery('(max-width: 767px)');
  const gradientId = useId();
  const [hover, setHover] = useState<number | null>(null);

  const points = result.data?.points ?? [];
  const plot = useMemo(() => buildPlot(points), [points]);
  const ticks = useMemo(
    () =>
      selectChartTicks(
        points.map((point) => point.timestamp),
        compact,
      ),
    [points, compact],
  );
  const empty = result.status === 'empty' || (result.status === 'success' && !plot);
  const lastData = result.data?.lastMetricAt
    ? interpolate(copy.lastData, {
        value: formatLastSeen(result.data.lastMetricAt, messages.dashboard.time),
      })
    : copy.lastDataNever;

  return (
    <section
      className={`${styles.panel} ${styles.chartPanel}`}
      aria-labelledby="dashboard-chart-title"
      data-testid="dashboard-chart"
    >
      <div className={styles.panelHead}>
        <h2 id="dashboard-chart-title">
          {interpolate(copy.titlePeriod, { period: copy.periods[period] })}
        </h2>
        <div className={styles.periodScroller} role="group" aria-label={copy.periodLabel}>
          {CHART_PERIODS.map((value) => (
            <button
              key={value}
              type="button"
              className={
                value === period
                  ? `${styles.periodButton} ${styles.periodActive}`
                  : styles.periodButton
              }
              aria-pressed={value === period}
              data-testid={`chart-period-${value}`}
              onClick={() => onPeriodChange(value)}
            >
              {compact ? copy.periodsShort[value] : copy.periods[value]}
            </button>
          ))}
        </div>
      </div>

      {result.status === 'error' ? (
        <div className={styles.chartWrap}>
          <DashboardErrorState
            title={copy.errorTitle}
            body={copy.errorBody}
            retryLabel={messages.dashboard.actions.retry}
            onRetry={onRetry}
            compact
          />
        </div>
      ) : null}

      {empty && result.status !== 'error' ? <ChartEmptyState /> : null}

      {result.status === 'success' && plot ? (
        <div className={styles.chartWrap}>
          <svg
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            className={styles.chartSvg}
            role="img"
            aria-label={copy.label}
            onMouseLeave={() => setHover(null)}
          >
            <defs>
              <linearGradient id={`${gradientId}-cpu`} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.18" />
                <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
              </linearGradient>
            </defs>
            {[0, 25, 50, 75, 100].map((value) => {
              const y =
                PADDING.top + ((100 - value) / 100) * (HEIGHT - PADDING.top - PADDING.bottom);
              return (
                <g key={value}>
                  <line
                    x1={PADDING.left}
                    x2={WIDTH - PADDING.right}
                    y1={y}
                    y2={y}
                    className={styles.chartGrid}
                  />
                  <text
                    x={PADDING.left - 8}
                    y={y + 4}
                    className={styles.chartAxis}
                    textAnchor="end"
                  >
                    {value}%
                  </text>
                </g>
              );
            })}
            {ticks.map((timestamp) => {
              const x = xFor(timestamp, points);
              return (
                <text
                  key={timestamp}
                  x={x}
                  y={HEIGHT - 8}
                  className={styles.chartAxis}
                  textAnchor="middle"
                >
                  {formatChartTick(timestamp, period, locale)}
                </text>
              );
            })}
            <path d={plot.cpuArea} fill={`url(#${gradientId}-cpu)`} />
            <path d={plot.cpuLine} className={styles.cpuLine} />
            <path d={plot.ramLine} className={styles.ramLine} />
            {points.map((point, index) => {
              const x = xAt(index, points.length);
              return (
                <rect
                  key={point.timestamp}
                  x={x - 10}
                  y={PADDING.top}
                  width="20"
                  height={HEIGHT - PADDING.top - PADDING.bottom}
                  fill="transparent"
                  onMouseEnter={() => setHover(index)}
                  onFocus={() => setHover(index)}
                  tabIndex={0}
                  aria-label={`${formatChartTick(point.timestamp, period, locale)}: ${copy.cpu} ${formatCompactPercent(point.cpuPercent)}, ${copy.ram} ${formatCompactPercent(point.ramPercent)}`}
                />
              );
            })}
            {hover !== null && points[hover] ? (
              <line
                x1={xAt(hover, points.length)}
                x2={xAt(hover, points.length)}
                y1={PADDING.top}
                y2={HEIGHT - PADDING.bottom}
                className={styles.chartGuide}
              />
            ) : null}
          </svg>
          {hover !== null && points[hover] ? (
            <div className={styles.chartTooltip} role="status">
              <strong>{formatChartTick(points[hover].timestamp, period, locale)}</strong>
              <span>
                {copy.cpu} {formatCompactPercent(points[hover].cpuPercent)}
              </span>
              <span>
                {copy.ram} {formatCompactPercent(points[hover].ramPercent)}
              </span>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className={styles.chartFooter}>
        <div className={styles.chartStats}>
          {result.data?.currentCpu !== null && result.data?.currentCpu !== undefined ? (
            <p>
              <span className={`${styles.legendSwatch} ${styles.legendCpu}`} />
              {copy.cpu} {formatCompactPercent(result.data.currentCpu)}
            </p>
          ) : null}
          {result.data?.currentRam !== null && result.data?.currentRam !== undefined ? (
            <p>
              <span className={`${styles.legendSwatch} ${styles.legendRam}`} />
              {copy.ram} {formatCompactPercent(result.data.currentRam)}
            </p>
          ) : null}
        </div>
        <p className={styles.chartLastData}>{lastData}</p>
      </div>
    </section>
  );
}

function xAt(index: number, count: number): number {
  if (count <= 1) {
    return (PADDING.left + WIDTH - PADDING.right) / 2;
  }
  return PADDING.left + (index / (count - 1)) * (WIDTH - PADDING.left - PADDING.right);
}

function yAt(value: number | null): number {
  const safe = value ?? 0;
  return PADDING.top + ((100 - safe) / 100) * (HEIGHT - PADDING.top - PADDING.bottom);
}

function xFor(timestamp: string, points: LoadSeries['points']): number {
  const index = points.findIndex((point) => point.timestamp === timestamp);
  return xAt(Math.max(0, index), points.length);
}

function buildPlot(points: LoadSeries['points']) {
  if (points.length < 2) {
    return null;
  }
  const cpuLine = points
    .map(
      (point, index) =>
        `${index === 0 ? 'M' : 'L'}${xAt(index, points.length).toFixed(1)},${yAt(point.cpuPercent).toFixed(1)}`,
    )
    .join(' ');
  const ramLine = points
    .map(
      (point, index) =>
        `${index === 0 ? 'M' : 'L'}${xAt(index, points.length).toFixed(1)},${yAt(point.ramPercent).toFixed(1)}`,
    )
    .join(' ');
  const lastX = xAt(points.length - 1, points.length);
  const firstX = xAt(0, points.length);
  const base = HEIGHT - PADDING.bottom;
  return {
    cpuLine,
    ramLine,
    cpuArea: `${cpuLine} L${lastX.toFixed(1)},${base} L${firstX.toFixed(1)},${base} Z`,
  };
}
