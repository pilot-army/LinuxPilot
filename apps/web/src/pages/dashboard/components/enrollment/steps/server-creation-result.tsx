import type { ServerDetail } from '@linuxpilot/server-contracts';
import type { InstallMode, WizardPhase } from '../../../../../features/enrollment/types';
import { useI18n } from '../../../../../i18n';
import { Button } from '../../../../../shared/ui/button';
import styles from '../enrollment-wizard.module.css';

type ServerCreationResultProps = {
  phase: WizardPhase;
  formName: string;
  address: string;
  installMode: InstallMode;
  server: ServerDetail | null;
  error?: string | null;
  onOpenServer: () => void;
  onAddAnother: () => void;
  onClose: () => void;
  onRetry: () => void;
  onRetryForm: () => void;
};

export function ServerCreationResult({
  phase,
  formName,
  address,
  installMode,
  server,
  error,
  onOpenServer,
  onAddAnother,
  onClose,
  onRetry,
  onRetryForm,
}: ServerCreationResultProps) {
  const { messages } = useI18n();
  const copy = messages.servers.create;
  const success = phase === 'success';
  const title = success
    ? copy.successTitle
    : phase === 'error'
      ? copy.errorTitle
      : copy.partialTitle;
  const status =
    server?.status === 'ONLINE'
      ? copy.agentConnected
      : installMode === 'none'
        ? copy.withoutAgent
        : copy.pendingAgent;

  return (
    <div className={styles.formCard} data-testid="server-creation-result">
      <h3>{title}</h3>
      {phase === 'partial_success' ? (
        <p>{installMode === 'none' ? copy.partialNone : copy.partialTimeout}</p>
      ) : null}
      {error ? (
        <p className={styles.alert} role="alert">
          {error}
        </p>
      ) : null}
      <dl className={styles.resultMeta}>
        <dt>{copy.nameLabel}</dt>
        <dd>{server?.name ?? formName}</dd>
        <dt>{copy.addressLabel}</dt>
        <dd>{server?.primaryIp ?? server?.hostname ?? address}</dd>
        <dt>{copy.successStatus}</dt>
        <dd>{status}</dd>
        <dt>{messages.servers.detail.agentVersion}</dt>
        <dd>{server?.agentVersion ?? '—'}</dd>
        <dt>{copy.successHeartbeat}</dt>
        <dd>{server?.lastSeenAt ?? '—'}</dd>
      </dl>
      <div className={styles.resultActions}>
        {server ? (
          <Button
            type="button"
            block={false}
            data-testid="open-created-server"
            onClick={onOpenServer}
          >
            {copy.openServer}
          </Button>
        ) : null}
        {phase === 'partial_success' && installMode !== 'none' ? (
          <Button
            type="button"
            variant="secondary"
            block={false}
            data-testid="retry-agent"
            onClick={onRetry}
          >
            {copy.retryInstall}
          </Button>
        ) : null}
        {phase === 'error' && !server ? (
          <Button
            type="button"
            variant="secondary"
            block={false}
            data-testid="retry-create"
            onClick={onRetryForm}
          >
            {copy.tryAgain}
          </Button>
        ) : null}
        <Button
          type="button"
          variant="secondary"
          block={false}
          data-testid="add-another"
          onClick={onAddAnother}
        >
          {copy.addAnother}
        </Button>
        <Button
          type="button"
          variant="ghost"
          block={false}
          data-testid="wizard-result-close"
          onClick={onClose}
        >
          {messages.common.actions.close}
        </Button>
      </div>
    </div>
  );
}
