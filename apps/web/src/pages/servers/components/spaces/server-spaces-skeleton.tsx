import styles from '../../server-spaces-page.module.css';

export function ServerSpacesSkeleton() {
  return (
    <div className={styles.skeleton} data-testid="groups-loading">
      <div className={`${styles.skeletonBlock} ${styles.skeletonHero}`} />
      <div className={styles.skeletonBlock} />
      <div className={styles.skeletonBlock} />
    </div>
  );
}
