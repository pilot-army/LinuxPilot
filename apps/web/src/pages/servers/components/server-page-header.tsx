import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import styles from '../server-section.module.css';

type Crumb = {
  label: string;
  to?: string;
  current?: boolean;
};

type ServerPageHeaderProps = {
  crumbs?: Crumb[];
  title: string;
  subtitle: string;
  sync: ReactNode;
  actions: ReactNode;
};

export function ServerPageHeader({
  crumbs,
  title,
  subtitle,
  sync,
  actions,
}: ServerPageHeaderProps) {
  return (
    <header className={styles.pageHeader}>
      <div className={styles.pageHeading}>
        {crumbs && crumbs.length > 0 ? (
          <nav className={styles.breadcrumb} aria-label={crumbs[0]?.label}>
            {crumbs.map((crumb, index) => (
              <span key={`${crumb.label}-${index}`}>
                {index > 0 ? <span aria-hidden="true"> / </span> : null}
                {crumb.to && !crumb.current ? (
                  <Link to={crumb.to}>{crumb.label}</Link>
                ) : (
                  <span aria-current={crumb.current ? 'page' : undefined}>{crumb.label}</span>
                )}
              </span>
            ))}
          </nav>
        ) : null}
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      <div className={styles.pageActions}>
        {sync}
        {actions}
      </div>
    </header>
  );
}
