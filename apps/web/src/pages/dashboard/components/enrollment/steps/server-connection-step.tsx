import { useEffect, useState } from 'react';
import { PERMISSIONS } from '@linuxpilot/auth-contracts';
import type { SshKey } from '@linuxpilot/server-contracts';
import { listSshKeys } from '../../../../../api/ssh-keys';
import { usePermission } from '../../../../../auth/use-permission';
import { ConnectionIcon, LockIcon, ShieldIcon } from '../../../../../features/dashboard/icons';
import type { CheckState, FieldErrors, WizardForm } from '../../../../../features/enrollment/types';
import { interpolate } from '../../../../../features/servers/format';
import { useI18n } from '../../../../../i18n';
import { Button } from '../../../../../shared/ui/button';
import { TextField } from '../../../../../shared/ui/text-field';
import { GenerateKeyPairDialog } from '../../../../servers/components/ssh-keys/ssh-key-dialogs';
import { SecureLinkArt } from '../wizard-art';
import styles from '../enrollment-wizard.module.css';

type ServerConnectionStepProps = {
  form: WizardForm;
  errors: FieldErrors;
  connectionCheck: CheckState;
  onChange: <K extends keyof WizardForm>(key: K, value: WizardForm[K]) => void;
  onBlur: (key: 'sshPort' | 'sshUser') => void;
  onTest: () => void;
  onCancelTest: () => void;
};

export function ServerConnectionStep({
  form,
  errors,
  connectionCheck,
  onChange,
  onBlur,
  onTest,
  onCancelTest,
}: ServerConnectionStepProps) {
  const { messages } = useI18n();
  const copy = messages.servers.create;
  const canCreateKeys = usePermission(PERMISSIONS.SSH_KEYS_CREATE);
  const canReadKeys = usePermission(PERMISSIONS.SSH_KEYS_READ);
  const [keys, setKeys] = useState<SshKey[]>([]);
  const [addOpen, setAddOpen] = useState(false);

  async function loadKeys(selectId?: string) {
    if (!canReadKeys) {
      return;
    }
    const result = await listSshKeys(new URLSearchParams({ usable: 'true', pageSize: '100' }));
    setKeys(result.items);
    if (selectId) {
      onChange('sshKeyId', selectId);
    }
  }

  useEffect(() => {
    if (!canReadKeys) {
      return;
    }
    void listSshKeys(new URLSearchParams({ usable: 'true', pageSize: '100' })).then((result) => {
      setKeys(result.items);
    });
  }, [canReadKeys]);
  const testing = connectionCheck === 'testing';
  const status =
    connectionCheck === 'success'
      ? copy.checkReady
      : connectionCheck === 'warning'
        ? copy.preflightWarning
        : connectionCheck === 'error'
          ? copy.checkFailed
          : testing
            ? copy.checkTesting
            : copy.checkNotRun;

  return (
    <div className={styles.addSplit} data-testid="server-connection-step">
      <div className={styles.formCard}>
        <h3>{copy.sshTitle}</h3>
        <div className={styles.formGrid}>
          <TextField
            name="ssh-port"
            label={copy.sshPortLabel}
            requiredMark
            inputMode="numeric"
            value={form.sshPort}
            error={errors.sshPort}
            data-testid="ssh-port"
            onChange={(event) => onChange('sshPort', event.target.value)}
            onBlur={() => onBlur('sshPort')}
          />
          <TextField
            name="ssh-user"
            label={copy.sshUserLabel}
            requiredMark
            value={form.sshUser}
            error={errors.sshUser}
            data-testid="ssh-user"
            onChange={(event) => onChange('sshUser', event.target.value)}
            onBlur={() => onBlur('sshUser')}
          />
        </div>
        {form.sshUser.trim().toLowerCase() === 'root' ? (
          <p className={styles.warn} role="status">
            {copy.rootWarning}
          </p>
        ) : null}
        <p className={styles.fieldLabel}>{copy.authMethod}</p>
        <div className={styles.authPill} data-testid="auth-enrollment">
          {copy.authEnrollment}
        </div>
        <p className={styles.hint}>{copy.authEnrollmentHint}</p>
        {canReadKeys ? (
          <>
            <label className={styles.fieldLabel} htmlFor="ssh-key">
              {copy.sshKeyLabel}
            </label>
            <select
              id="ssh-key"
              className={styles.nativeSelect}
              value={form.sshKeyId}
              data-testid="ssh-key-select"
              onChange={(event) => onChange('sshKeyId', event.target.value)}
            >
              <option value="">{copy.sshKeyPlaceholder}</option>
              {keys.map((key) => (
                <option key={key.id} value={key.id}>
                  {key.name} · {key.algorithm} · {key.fingerprint} ·{' '}
                  {interpolate(copy.sshKeyUsageCount, { count: key.usage.servers })}
                </option>
              ))}
            </select>
            {keys.length === 0 ? <p className={styles.hint}>{copy.sshKeyEmpty}</p> : null}
            <p className={styles.hint}>{copy.sshKeyHint}</p>
            {canCreateKeys ? (
              <Button
                type="button"
                variant="ghost"
                block={false}
                data-testid="wizard-add-ssh-key"
                onClick={() => setAddOpen(true)}
              >
                {copy.sshKeyAdd}
              </Button>
            ) : null}
            <GenerateKeyPairDialog
              open={addOpen}
              onClose={() => setAddOpen(false)}
              onCreated={(key) => {
                void loadKeys(key.id);
              }}
            />
          </>
        ) : null}
        <label className={styles.checkRow}>
          <span>{copy.useSudo}</span>
          <input
            type="checkbox"
            checked={form.useSudo}
            data-testid="use-sudo"
            onChange={(event) => onChange('useSudo', event.target.checked)}
          />
        </label>
        {form.useSudo ? (
          <>
            <label className={styles.fieldLabel} htmlFor="sudo-method">
              {copy.sudoMethod}
            </label>
            <select id="sudo-method" className={styles.nativeSelect} value="sudo" disabled>
              <option value="sudo">{copy.sudoMethodSudo}</option>
            </select>
          </>
        ) : null}
        <details className={styles.bastion}>
          <summary>{copy.bastionTitle}</summary>
          <p className={styles.hint}>{copy.bastionUnavailable}</p>
          <select className={styles.nativeSelect} disabled defaultValue="">
            <option value="">{copy.bastionNone}</option>
          </select>
        </details>
        <div className={styles.checkRow}>
          <Button
            type="button"
            variant="secondary"
            block={false}
            loading={testing}
            disabled={testing}
            data-testid="check-connection"
            onClick={onTest}
          >
            <ConnectionIcon />
            {copy.checkConnection}
          </Button>
          {testing ? (
            <Button type="button" variant="ghost" block={false} onClick={onCancelTest}>
              {copy.cancelCheck}
            </Button>
          ) : null}
          <p
            className={styles.muted}
            role="status"
            aria-live="polite"
            data-testid="connection-check-status"
          >
            {status}
          </p>
        </div>
        <p className={styles.hint}>{copy.checkConnectionHint}</p>
      </div>
      <aside className={styles.sideCard}>
        <h3>
          <LockIcon />
          {copy.secureTitle}
        </h3>
        <div className={styles.sideArt}>
          <SecureLinkArt />
        </div>
        <ul>
          <li>{copy.secureBody1}</li>
          <li>{copy.secureBody2}</li>
          <li>{copy.secureBody3}</li>
        </ul>
        <label className={styles.toggleRow}>
          <span>
            <strong>{copy.fingerprintToggle}</strong>
            <p className={styles.hint}>{copy.fingerprintHint}</p>
          </span>
          <button
            type="button"
            className={styles.autoDetectSwitch}
            role="switch"
            aria-checked={form.fingerprintCheck}
            data-testid="fingerprint-toggle"
            onClick={() => onChange('fingerprintCheck', !form.fingerprintCheck)}
          >
            <span className={styles.autoDetectThumb} />
          </button>
        </label>
        <select className={styles.nativeSelect} value="auto" disabled>
          <option value="auto">{copy.fingerprintAuto}</option>
        </select>
        <p className={styles.hint}>
          <ShieldIcon /> {copy.checkFingerprint}
        </p>
      </aside>
    </div>
  );
}
