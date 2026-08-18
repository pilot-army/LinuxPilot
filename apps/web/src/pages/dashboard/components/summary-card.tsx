import type { ReactNode } from 'react';
import styles from '../dashboard-page.module.css';

type SummaryAccent = 'blue' | 'success' | 'danger' | 'cyan' | 'violet';

type SummaryCardProps = {
  title: string;
  value: string;
  hint: string;
  meta?: string;
  badge?: string;
  meter?: number | null;
  accent: SummaryAccent;
  icon: ReactNode;
};

export function SummaryCard({
  title,
  value,
  hint,
  meta,
  badge,
  meter,
  accent,
  icon,
}: SummaryCardProps) {
  return (
    <article className={`${styles.summaryCard} ${styles[`accent-${accent}`]}`}>
      <div className={styles.summaryTop}>
        <h3>{title}</h3>
        <span className={styles.summaryIcon} aria-hidden="true">
          {icon}
        </span>
      </div>
      <p className={styles.summaryValue}>
        <span>{value}</span>
      </p>
      <p className={styles.summaryHint}>{hint}</p>
      {typeof meter === 'number' ? (
        <div className={styles.summarySpark} aria-hidden="true">
          <span style={{ width: `${Math.min(100, Math.max(0, meter))}%` }} />
        </div>
      ) : null}
      {badge ? (
        <p className={`${styles.summaryBadge} ${styles[`badge-${accent}`]}`}>{badge}</p>
      ) : null}
      {meta ? <p className={styles.summaryMeta}>{meta}</p> : null}
    </article>
  );
}
