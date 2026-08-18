import styles from '../dashboard-page.module.css';

export function DashboardSkeleton() {
  return (
    <div className={styles.skeleton} data-testid="dashboard-loading" aria-hidden="true">
      <div className={styles.pageHeader}>
        <div className={styles.pageHeading}>
          <span className={`${styles.bone} ${styles.boneLine}`} />
          <span className={`${styles.bone} ${styles.boneLine}`} />
        </div>
        <span className={`${styles.bone} ${styles.boneLine}`} />
      </div>
      <div className={styles.row2}>
        <span className={`${styles.bone} ${styles.bonePanel}`} />
        <span className={`${styles.bone} ${styles.bonePanel}`} />
      </div>
      <div className={styles.row2}>
        <span className={`${styles.bone} ${styles.bonePanelShort}`} />
        <span className={`${styles.bone} ${styles.bonePanelShort}`} />
      </div>
      <div className={styles.row2}>
        <span className={`${styles.bone} ${styles.bonePanel}`} />
        <span className={`${styles.bone} ${styles.bonePanel}`} />
      </div>
      <div className={styles.row3}>
        <span className={`${styles.bone} ${styles.bonePanelShort}`} />
        <span className={`${styles.bone} ${styles.bonePanelShort}`} />
        <span className={`${styles.bone} ${styles.bonePanelShort}`} />
      </div>
    </div>
  );
}
