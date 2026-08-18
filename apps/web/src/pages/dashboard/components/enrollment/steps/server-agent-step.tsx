import {
  DocsIcon,
  ExternalIcon,
  ShieldIcon,
  TerminalIcon,
  WarningIcon,
} from '../../../../../features/dashboard/icons';
import { INSTALL_GUIDE_URL } from '../../../../../features/enrollment/command';
import type { CheckState, InstallMode, WizardForm } from '../../../../../features/enrollment/types';
import { useI18n } from '../../../../../i18n';
import { Button } from '../../../../../shared/ui/button';
import { AgentMeshArt } from '../wizard-art';
import styles from '../enrollment-wizard.module.css';

type ServerAgentStepProps = {
  form: WizardForm;
  compatCheck: CheckState;
  onChange: <K extends keyof WizardForm>(key: K, value: WizardForm[K]) => void;
  onCheck: () => void;
  onCancelCheck: () => void;
};

const INTERVALS = [
  { value: '30', key: 'interval30' },
  { value: '60', key: 'interval60' },
  { value: '300', key: 'interval300' },
] as const;

export function ServerAgentStep({
  form,
  compatCheck,
  onChange,
  onCheck,
  onCancelCheck,
}: ServerAgentStepProps) {
  const { messages } = useI18n();
  const copy = messages.servers.create;
  const testing = compatCheck === 'testing';
  const modes: Array<{ id: InstallMode; title: string; hint: string; recommended?: boolean }> = [
    { id: 'auto', title: copy.installAuto, hint: copy.installAutoHint, recommended: true },
    { id: 'manual', title: copy.installManual, hint: copy.installManualHint },
    { id: 'none', title: copy.installNone, hint: copy.installNoneHint },
  ];

  return (
    <div className={styles.addSplit} data-testid="server-agent-step">
      <div>
        <h3>{copy.agentTitle}</h3>
        <div className={styles.modeGrid} role="radiogroup" aria-label={copy.installModeLabel}>
          {modes.map((mode) => (
            <button
              key={mode.id}
              type="button"
              role="radio"
              aria-checked={form.installMode === mode.id}
              className={styles.modeCard}
              data-active={form.installMode === mode.id}
              data-testid={`install-mode-${mode.id}`}
              onClick={() => onChange('installMode', mode.id)}
            >
              {mode.id === 'manual' ? <TerminalIcon /> : null}
              {mode.id === 'none' ? <WarningIcon /> : null}
              <strong>{mode.title}</strong>
              {mode.recommended ? <span className={styles.badge}>{copy.recommended}</span> : null}
              <span>{mode.hint}</span>
            </button>
          ))}
        </div>
        {form.installMode === 'none' ? (
          <div className={styles.formCard}>
            <strong>{copy.noneLimitsTitle}</strong>
            <ul>
              <li>{copy.noneLimits1}</li>
              <li>{copy.noneLimits2}</li>
              <li>{copy.noneLimits3}</li>
              <li>{copy.noneLimits4}</li>
            </ul>
            <label className={styles.checkRow}>
              <input
                type="checkbox"
                checked={form.confirmNoAgent}
                data-testid="confirm-no-agent"
                onChange={(event) => onChange('confirmNoAgent', event.target.checked)}
              />
              <span>{copy.confirmNoAgent}</span>
            </label>
          </div>
        ) : null}
        <div className={styles.detectedBar} data-testid="detected-system">
          <span>{copy.detectedSystem}</span>
          <span className={styles.ok}>{copy.detectedPending}</span>
        </div>
        <div className={styles.formCard}>
          <label className={styles.fieldLabel} htmlFor="update-channel">
            {copy.updateChannel}
          </label>
          <select id="update-channel" className={styles.nativeSelect} value="stable" disabled>
            <option value="stable">{copy.channelStable}</option>
          </select>
          <p className={styles.hint}>{copy.channelHint}</p>
          <Toggle
            label={copy.autoUpdate}
            hint={copy.autoUpdateHint}
            checked={form.autoUpdate}
            testId="auto-update"
            onChange={(value) => onChange('autoUpdate', value)}
          />
          <Toggle
            label={copy.metricsToggle}
            hint={copy.metricsHint}
            checked={form.metricsEnabled}
            testId="metrics-enabled"
            onChange={(value) => onChange('metricsEnabled', value)}
          />
          {form.metricsEnabled ? (
            <>
              <div className={styles.metricList}>
                <MetricBox
                  label={copy.metricCpu}
                  checked={form.metricCpu}
                  testId="metric-cpu"
                  onChange={(value) => onChange('metricCpu', value)}
                />
                <MetricBox
                  label={copy.metricRam}
                  checked={form.metricRam}
                  testId="metric-ram"
                  onChange={(value) => onChange('metricRam', value)}
                />
                <MetricBox
                  label={copy.metricDisk}
                  checked={form.metricDisk}
                  testId="metric-disk"
                  onChange={(value) => onChange('metricDisk', value)}
                />
                <MetricBox
                  label={copy.metricNetwork}
                  checked={form.metricNetwork}
                  testId="metric-network"
                  onChange={(value) => onChange('metricNetwork', value)}
                />
              </div>
              <label className={styles.fieldLabel} htmlFor="metrics-interval">
                {copy.metricsInterval}
              </label>
              <select
                id="metrics-interval"
                className={styles.nativeSelect}
                value={form.metricsInterval}
                data-testid="metrics-interval"
                onChange={(event) =>
                  onChange('metricsInterval', event.target.value as WizardForm['metricsInterval'])
                }
              >
                {INTERVALS.map((interval) => (
                  <option key={interval.value} value={interval.value}>
                    {copy[interval.key]}
                  </option>
                ))}
              </select>
            </>
          ) : null}
          <Toggle
            label={copy.remoteControl}
            hint={copy.remoteControlHint}
            checked={form.remoteControl}
            testId="remote-control"
            onChange={(value) => onChange('remoteControl', value)}
          />
          <div className={styles.checkRow}>
            <Button
              type="button"
              variant="secondary"
              block={false}
              loading={testing}
              disabled={testing}
              data-testid="check-compat"
              onClick={onCheck}
            >
              {copy.checkCompat}
            </Button>
            {testing ? (
              <Button type="button" variant="ghost" block={false} onClick={onCancelCheck}>
                {copy.cancelCheck}
              </Button>
            ) : null}
            <p className={styles.ok} role="status" aria-live="polite" data-testid="compat-status">
              {compatCheck === 'success'
                ? copy.compatOk
                : compatCheck === 'warning'
                  ? copy.compatWarning
                  : compatCheck === 'error'
                    ? copy.checkFailed
                    : testing
                      ? copy.checkTesting
                      : copy.notChecked}
            </p>
          </div>
        </div>
      </div>
      <aside className={styles.sideCard}>
        <h3>{copy.agentDoesTitle}</h3>
        <div className={styles.sideArt}>
          <AgentMeshArt />
        </div>
        <ul>
          <li>{copy.agentDoes1}</li>
          <li>{copy.agentDoes2}</li>
          <li>{copy.agentDoes3}</li>
          <li>{copy.agentDoes4}</li>
        </ul>
        <p className={styles.hint}>
          <ShieldIcon /> {copy.tokenSafety}
        </p>
        <a className={styles.docsLink} href={INSTALL_GUIDE_URL} target="_blank" rel="noreferrer">
          <DocsIcon />
          {copy.agentDocs}
          <ExternalIcon />
        </a>
      </aside>
    </div>
  );
}

function Toggle({
  label,
  hint,
  checked,
  testId,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  testId: string;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className={styles.toggleRow}>
      <span>
        <strong>{label}</strong>
        <p className={styles.hint}>{hint}</p>
      </span>
      <button
        type="button"
        className={styles.autoDetectSwitch}
        role="switch"
        aria-checked={checked}
        data-testid={testId}
        onClick={() => onChange(!checked)}
      >
        <span className={styles.autoDetectThumb} />
      </button>
    </label>
  );
}

function MetricBox({
  label,
  checked,
  testId,
  onChange,
}: {
  label: string;
  checked: boolean;
  testId: string;
  onChange: (value: boolean) => void;
}) {
  return (
    <label>
      <input
        type="checkbox"
        checked={checked}
        data-testid={testId}
        onChange={(event) => onChange(event.target.checked)}
      />{' '}
      {label}
    </label>
  );
}
