import { Link } from 'react-router-dom';
import {
  BackupIcon,
  OperationsIcon,
  PlusIcon,
  TerminalIcon,
} from '../../../features/dashboard/icons';
import { useI18n } from '../../../i18n';
import styles from '../dashboard-page.module.css';

type DashboardQuickActionsProps = {
  canCreate: boolean;
  onAddServer?: () => void;
};

export function DashboardQuickActions({ canCreate, onAddServer }: DashboardQuickActionsProps) {
  const { messages } = useI18n();
  const copy = messages.dashboard.quickActions;

  return (
    <section className={styles.panel} data-testid="dashboard-quick-actions">
      <div className={styles.panelHead}>
        <h2>{copy.title}</h2>
      </div>
      <div className={styles.quickGrid}>
        {canCreate && onAddServer ? (
          <button
            type="button"
            className={styles.quickAction}
            onClick={onAddServer}
            data-testid="dashboard-add-server"
          >
            <PlusIcon />
            <span>
              <strong>{copy.addServer}</strong>
              <small>{copy.addServerHint}</small>
            </span>
            <span aria-hidden="true">→</span>
          </button>
        ) : (
          <p className={styles.emptyBody}>{messages.dashboard.permissions.askAdmin}</p>
        )}
        <span
          className={`${styles.quickAction} ${styles.quickDisabled}`}
          title={messages.dashboard.nav.unavailable}
        >
          <TerminalIcon />
          <span>
            <strong>{copy.openTerminal}</strong>
            <small>{copy.openTerminalHint}</small>
          </span>
        </span>
        <Link to="/server-operations" className={styles.quickAction}>
          <OperationsIcon />
          <span>
            <strong>{copy.runOperation}</strong>
            <small>{copy.runOperationHint}</small>
          </span>
          <span aria-hidden="true">→</span>
        </Link>
        <span
          className={`${styles.quickAction} ${styles.quickDisabled}`}
          title={copy.createBackupHint}
        >
          <BackupIcon />
          <span>
            <strong>{copy.createBackup}</strong>
            <small>{copy.createBackupHint}</small>
          </span>
        </span>
      </div>
    </section>
  );
}
