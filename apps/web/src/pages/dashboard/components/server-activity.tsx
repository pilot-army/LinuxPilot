import type { DailyActivityPoint, WidgetResult } from '../../../features/dashboard/types';
import { useI18n } from '../../../i18n';
import { DashboardEmptyState } from './dashboard-empty-state';
import styles from '../dashboard-page.module.css';

type ServerActivityProps = {
  result: WidgetResult<DailyActivityPoint[]>;
};

export function ServerActivity({ result }: ServerActivityProps) {
  const { locale, messages } = useI18n();
  const copy = messages.dashboard.week;
  const points = result.data ?? [];
  const max = Math.max(1, ...points.flatMap((point) => [point.incidents, point.operations]));

  return (
    <section className={styles.panel} data-testid="dashboard-week-activity">
      <div className={styles.panelHead}>
        <h2>{copy.title}</h2>
      </div>
      {points.length === 0 || result.status === 'empty' ? (
        <DashboardEmptyState title={copy.empty} />
      ) : (
        <div className={styles.weekChart} role="img" aria-label={copy.label}>
          {points.map((point) => {
            const label = new Intl.DateTimeFormat(locale === 'uk' ? 'uk-UA' : 'en-GB', {
              weekday: 'short',
            }).format(new Date(`${point.date}T00:00:00`));
            return (
              <div key={point.date} className={styles.weekCol}>
                <div className={styles.weekBars}>
                  <span
                    className={styles.weekOps}
                    style={{ height: `${(point.operations / max) * 100}%` }}
                    title={`${copy.operations}: ${point.operations}`}
                  />
                  <span
                    className={styles.weekIncidents}
                    style={{ height: `${(point.incidents / max) * 100}%` }}
                    title={`${copy.incidents}: ${point.incidents}`}
                  />
                </div>
                <span>{label}</span>
              </div>
            );
          })}
        </div>
      )}
      <div className={styles.weekLegend}>
        <span>
          <i className={styles.legendOps} /> {copy.operations}
        </span>
        <span>
          <i className={styles.legendIncidents} /> {copy.incidents}
        </span>
      </div>
    </section>
  );
}
