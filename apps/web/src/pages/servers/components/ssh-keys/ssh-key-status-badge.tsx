import type { SshKeyStatus } from '@linuxpilot/server-contracts';
import { useI18n } from '../../../../i18n';
import styles from '../../server-ssh-keys-page.module.css';

const TONE: Record<SshKeyStatus, 'ok' | 'warn' | 'danger' | 'neutral'> = {
  active: 'ok',
  unused: 'neutral',
  rotation_required: 'warn',
  expired: 'danger',
  disabled: 'neutral',
  compromised: 'danger',
  deleting: 'warn',
};

export function SshKeyStatusBadge({ status }: { status: SshKeyStatus }) {
  const { messages } = useI18n();
  return (
    <span
      className={styles.status}
      data-tone={TONE[status]}
      data-testid={`ssh-key-status-${status}`}
    >
      <span className={styles.statusDot} aria-hidden="true" />
      {messages.servers.sshKeys.statuses[status]}
    </span>
  );
}
