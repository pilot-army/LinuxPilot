import { CheckIcon, InfoIcon, WarningIcon } from '../../../../../features/dashboard/icons';
import type { CheckState, WizardForm } from '../../../../../features/enrollment/types';
import type { ServerSpace } from '@linuxpilot/server-contracts';
import { useI18n } from '../../../../../i18n';
import styles from '../enrollment-wizard.module.css';

type ServerReviewStepProps = {
  form: WizardForm;
  spaces: ServerSpace[];
  connectionCheck: CheckState;
  compatCheck: CheckState;
  onGoTo: (step: 1 | 2 | 3) => void;
  onChange: <K extends keyof WizardForm>(key: K, value: WizardForm[K]) => void;
};

export function ServerReviewStep({
  form,
  spaces,
  connectionCheck,
  compatCheck,
  onGoTo,
  onChange,
}: ServerReviewStepProps) {
  const { messages } = useI18n();
  const copy = messages.servers.create;
  const spaceName = spaces.find((space) => space.id === form.spaceId)?.name ?? copy.noSpace;
  const installLabel =
    form.installMode === 'auto'
      ? copy.installAuto
      : form.installMode === 'manual'
        ? copy.installManual
        : copy.installNone;
  const checks = [
    {
      ok: connectionCheck === 'success' || connectionCheck === 'warning',
      label: copy.checkNetwork,
      warn: connectionCheck === 'warning',
    },
    {
      ok: connectionCheck === 'success' || connectionCheck === 'warning',
      label: copy.checkSshFields,
      warn: false,
    },
    { ok: true, label: copy.checkAuth, warn: false },
    { ok: form.useSudo, label: copy.checkSudo, warn: !form.useSudo },
    { ok: true, label: copy.checkOs, warn: true },
    { ok: true, label: copy.checkDisk, warn: true },
    { ok: true, label: copy.checkAgentPort, warn: true },
    { ok: form.fingerprintCheck, label: copy.checkFingerprint, warn: !form.fingerprintCheck },
    { ok: compatCheck !== 'error', label: copy.checkCompatItem, warn: compatCheck !== 'success' },
  ];

  return (
    <div className={styles.addSplit} data-testid="server-review-step">
      <div>
        <h3>{copy.reviewTitle}</h3>
        <p className={styles.hint}>{copy.reviewSubtitle}</p>
        <section className={styles.reviewBlock}>
          <h3>{copy.reviewServer}</h3>
          <button
            type="button"
            className={styles.editLink}
            data-testid="edit-step-1"
            onClick={() => onGoTo(1)}
          >
            {copy.change}
          </button>
          <dl>
            <dt>{copy.nameLabel}</dt>
            <dd>{form.name}</dd>
            <dt>{copy.addressLabel}</dt>
            <dd>{form.address}</dd>
            <dt>{copy.space}</dt>
            <dd>{spaceName}</dd>
            <dt>{copy.tagsLabel}</dt>
            <dd>{form.tags.length ? form.tags.join(', ') : '—'}</dd>
          </dl>
        </section>
        <section className={styles.reviewBlock}>
          <h3>{copy.reviewSsh}</h3>
          <button
            type="button"
            className={styles.editLink}
            data-testid="edit-step-2"
            onClick={() => onGoTo(2)}
          >
            {copy.change}
          </button>
          <dl>
            <dt>{copy.sshPortLabel}</dt>
            <dd>{form.sshPort}</dd>
            <dt>{copy.sshUserLabel}</dt>
            <dd>{form.sshUser}</dd>
            <dt>{copy.authMethod}</dt>
            <dd>{copy.authEnrollment}</dd>
            <dt>{copy.useSudo}</dt>
            <dd>{form.useSudo ? copy.enabled : copy.disabled}</dd>
            <dt>{copy.fingerprintToggle}</dt>
            <dd>{form.fingerprintCheck ? copy.enabled : copy.disabled}</dd>
          </dl>
          <p className={connectionCheck === 'success' ? styles.ok : styles.warn} role="status">
            {connectionCheck === 'success' ? copy.checkReady : copy.preflightWarning}
          </p>
        </section>
        <section className={styles.reviewBlock}>
          <h3>{copy.reviewAgent}</h3>
          <button
            type="button"
            className={styles.editLink}
            data-testid="edit-step-3"
            onClick={() => onGoTo(3)}
          >
            {copy.change}
          </button>
          <dl>
            <dt>{copy.installModeLabel}</dt>
            <dd>{installLabel}</dd>
            <dt>{copy.detectedSystem}</dt>
            <dd>{copy.detectedPending}</dd>
            <dt>{copy.updateChannel}</dt>
            <dd>{copy.channelStable}</dd>
            <dt>{copy.autoUpdate}</dt>
            <dd>{form.autoUpdate ? copy.enabled : copy.disabled}</dd>
            <dt>{copy.metricsInterval}</dt>
            <dd>
              {form.metricsEnabled
                ? form.metricsInterval === '30'
                  ? copy.interval30
                  : form.metricsInterval === '300'
                    ? copy.interval300
                    : copy.interval60
                : copy.disabled}
            </dd>
            <dt>{copy.remoteControl}</dt>
            <dd>{form.remoteControl ? copy.enabled : copy.disabled}</dd>
          </dl>
          <p className={compatCheck === 'success' ? styles.ok : styles.muted} role="status">
            {compatCheck === 'success' ? copy.compatOk : copy.compatWarning}
          </p>
        </section>
      </div>
      <aside className={styles.sideCard}>
        <h3>{copy.checkResults}</h3>
        <ul className={styles.checkList}>
          {checks.map((item) => (
            <li
              key={item.label}
              className={item.ok ? (item.warn ? styles.warn : styles.ok) : styles.muted}
            >
              {item.ok ? item.warn ? <WarningIcon /> : <CheckIcon /> : <InfoIcon />}
              <span>{item.label}</span>
            </li>
          ))}
        </ul>
        <p className={styles.hint}>
          <InfoIcon /> {copy.firewallNote}
        </p>
        <p className={styles.afterConfirm}>{copy.afterConfirm}</p>
        <label className={styles.checkRow}>
          <input
            type="checkbox"
            checked={form.confirmAdd}
            data-testid="confirm-add"
            onChange={(event) => onChange('confirmAdd', event.target.checked)}
          />
          <span>{form.installMode === 'none' ? copy.confirmAddNone : copy.confirmAdd}</span>
        </label>
      </aside>
    </div>
  );
}
