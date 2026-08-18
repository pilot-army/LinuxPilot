import { useEffect, useState } from 'react';
import {
  CheckIcon,
  ClockIcon,
  CopyIcon,
  DocsIcon,
  EyeIcon,
  EyeOffIcon,
  RefreshIcon,
  ServersIcon,
  ShieldIcon,
  WarningIcon,
} from '../../../../../features/dashboard/icons';
import {
  COPY_FEEDBACK_MS,
  INSTALL_GUIDE_URL,
  TOKEN_REVEAL_MS,
  buildEnrollCommand,
  maskEnrollCommand,
} from '../../../../../features/enrollment/command';
import { formatSystemSummary } from '../../../../../features/enrollment/system-summary';
import { tokenTtl } from '../../../../../features/enrollment/token-ttl';
import type {
  ConnectionOutcome,
  EnrollmentSecret,
  WizardForm,
} from '../../../../../features/enrollment/types';
import { interpolate } from '../../../../../features/servers/format';
import { useI18n } from '../../../../../i18n';
import { Button } from '../../../../../shared/ui/button';
import styles from '../enrollment-wizard.module.css';

type AgentInstallationStepProps = {
  form: WizardForm;
  secret: EnrollmentSecret | null;
  busy: boolean;
  tokenCreated: boolean;
  connectionOutcome: ConnectionOutcome;
  agentNotReady: boolean;
  onRequestRegenerate: () => void;
  onRetryCheck: () => void;
};

export function AgentInstallationStep({
  form,
  secret,
  busy,
  tokenCreated,
  connectionOutcome,
  agentNotReady,
  onRequestRegenerate,
  onRetryCheck,
}: AgentInstallationStepProps) {
  const { messages } = useI18n();
  const copy = messages.servers.create;
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const ttl = tokenTtl(secret?.expiresAt, now);
  const expired = ttl.expired;
  const displayCommand = secret
    ? revealed
      ? buildEnrollCommand(secret.enrollCommand, secret.token)
      : maskEnrollCommand(secret.enrollCommand)
    : '';
  const ttlLabel = ttl.expired
    ? copy.tokenExpired
    : interpolate(ttl.unit === 'minutes' ? copy.tokenTtlMinutes : copy.tokenTtlSeconds, {
        count: ttl.count,
      });

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    setRevealed(false);
    setCopied(false);
    setCopyError(false);
  }, [secret?.expiresAt]);

  useEffect(() => {
    if (!revealed) {
      return;
    }
    const timer = window.setTimeout(() => setRevealed(false), TOKEN_REVEAL_MS);
    function hide() {
      setRevealed(false);
    }
    function onVisibility() {
      if (document.hidden) {
        hide();
      }
    }
    window.addEventListener('blur', hide);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('blur', hide);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [revealed]);

  useEffect(() => {
    if (!copied && !copyError) {
      return;
    }
    const timer = window.setTimeout(() => {
      setCopied(false);
      setCopyError(false);
    }, COPY_FEEDBACK_MS);
    return () => window.clearTimeout(timer);
  }, [copied, copyError]);

  async function copyCommand() {
    if (!secret) {
      return;
    }
    try {
      await navigator.clipboard.writeText(buildEnrollCommand(secret.enrollCommand, secret.token));
      setCopied(true);
      setCopyError(false);
    } catch {
      setCopied(false);
      setCopyError(true);
    }
  }

  const connected = connectionOutcome === 'connected' || connectionOutcome === 'metrics';
  const status = connected
    ? 'connected'
    : connectionOutcome === 'error'
      ? 'error'
      : expired
        ? 'expired'
        : 'waiting';

  return (
    <section className={styles.installStep} data-testid="enrollment-token-panel">
      <div className={styles.serverSummary}>
        <p className={styles.serverIdentity} data-testid="install-server-name">
          <ServersIcon />
          <span>{form.name.trim()}</span>
        </p>
        <p className={styles.systemSummary} data-testid="system-summary">
          {formatSystemSummary(form, copy)}
        </p>
        <span
          className={styles.tokenBadge}
          data-expired={expired || undefined}
          data-testid="token-ttl"
        >
          <ClockIcon />
          {ttlLabel}
        </span>
      </div>

      <p className={styles.securityWarning} role="note">
        <ShieldIcon />
        {copy.tokenSafety}
      </p>

      <div>
        <p className={styles.fieldLabel} id="enrollment-command-label">
          {copy.enrollCommand}
        </p>
        <div className={styles.commandBlock}>
          <div className={styles.commandBadges}>
            <span className={styles.commandBadge}>{copy.badgeLinux}</span>
            <span className={styles.commandBadge}>{copy.badgeRoot}</span>
          </div>
          <div className={styles.command}>
            <code
              data-testid="enroll-command"
              aria-labelledby="enrollment-command-label"
              aria-describedby={revealed ? undefined : 'enroll-command-mask'}
            >
              {displayCommand}
            </code>
            <button
              type="button"
              className={styles.reveal}
              aria-pressed={revealed}
              aria-label={revealed ? copy.hideToken : copy.showToken}
              disabled={!secret || expired}
              data-testid="toggle-token"
              onClick={() => setRevealed((current) => !current)}
            >
              {revealed ? <EyeOffIcon /> : <EyeIcon />}
            </button>
            <button
              type="button"
              className={styles.copy}
              disabled={!secret || expired}
              aria-label={copied ? copy.copied : copy.copyCommand}
              data-testid="copy-command"
              onClick={() => void copyCommand()}
            >
              <CopyIcon />
            </button>
          </div>
        </div>
        {revealed ? null : (
          <p id="enroll-command-mask" className={styles.srOnly}>
            {copy.tokenMasked}
          </p>
        )}
        <p className={styles.srOnly} aria-live="polite">
          {copied ? copy.copied : copyError ? copy.copyCommandFailed : ''}
        </p>
        {copied ? <p className={styles.copied}>{copy.copied}</p> : null}
        {copyError ? <p className={styles.copyError}>{copy.copyCommandFailed}</p> : null}
        {tokenCreated ? (
          <p className={styles.copied} role="status" data-testid="token-created">
            {copy.tokenCreated}
          </p>
        ) : null}
      </div>

      <div className={styles.installActions}>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          block={false}
          className={styles.newTokenButton}
          data-testid="regenerate-token"
          disabled={busy}
          loading={busy}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onRequestRegenerate();
          }}
        >
          <RefreshIcon />
          {copy.regenerateToken}
        </Button>
        <a
          className={styles.installGuide}
          href={INSTALL_GUIDE_URL}
          target="_blank"
          rel="noopener noreferrer"
          data-testid="install-guide"
        >
          <DocsIcon />
          {copy.installGuide}
        </a>
      </div>

      <div
        className={styles.agentStatus}
        data-state={status}
        data-testid="agent-wait-status"
        role="status"
        aria-live="polite"
      >
        {status === 'connected' ? <CheckIcon /> : null}
        {status === 'waiting' ? <span className={styles.pulse} aria-hidden="true" /> : null}
        {status === 'error' || status === 'expired' ? <WarningIcon /> : null}
        <span>
          {status === 'connected'
            ? copy.agentConnected
            : status === 'error'
              ? copy.checkFailed
              : status === 'expired'
                ? copy.tokenExpiredLong
                : copy.waitingAgent}
        </span>
        {status === 'expired' ? (
          <Button
            variant="ghost"
            size="sm"
            block={false}
            className={styles.statusAction}
            disabled={busy}
            onClick={onRequestRegenerate}
          >
            {copy.regenerateToken}
          </Button>
        ) : null}
        {status === 'error' ? (
          <Button
            variant="ghost"
            size="sm"
            block={false}
            className={styles.statusAction}
            data-testid="retry-agent-check"
            disabled={busy}
            onClick={onRetryCheck}
          >
            {copy.retry}
          </Button>
        ) : null}
      </div>
      {agentNotReady ? (
        <p className={styles.agentNotReady} role="status" data-testid="agent-not-ready">
          {copy.agentNotReady}
        </p>
      ) : null}
      {connected ? null : (
        <p className={styles.hint} data-testid="add-later-hint">
          {copy.addLaterHint}
        </p>
      )}
    </section>
  );
}
