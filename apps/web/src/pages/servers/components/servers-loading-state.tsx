import styles from '../servers-page.module.css';

export function ServersLoadingState({ testId = 'servers-loading' }: { testId?: string }) {
  return (
    <div className={styles.pageSkeleton} data-testid={testId} aria-hidden="true">
      <div className={styles.summaryBar}>
        <span className={styles.boneWide} />
        <span className={styles.bone} />
        <span className={styles.bone} />
        <span className={styles.bone} />
      </div>
      <div className={styles.toolbar}>
        <span className={styles.boneWide} />
        <span className={styles.bone} />
        <span className={styles.bone} />
        <span className={styles.bone} />
      </div>
      <div className={styles.tableSkeleton}>
        <span className={styles.boneWide} />
        <span className={styles.boneWide} />
        <span className={styles.boneWide} />
        <span className={styles.boneWide} />
        <span className={styles.boneWide} />
      </div>
    </div>
  );
}
