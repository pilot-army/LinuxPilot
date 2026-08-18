import { useEffect, useState } from 'react';
import { CopyIcon, ExternalIcon } from '../../../features/dashboard/icons';
import { interpolate } from '../../../features/dashboard/format';
import type { EnrollmentPreview } from '../../../features/dashboard/types';
import { useI18n } from '../../../i18n';
import styles from '../dashboard-page.module.css';

type QuickStartCardProps = {
  preview: EnrollmentPreview | null;
  canCreate: boolean;
  onOpenWizard: () => void;
};

export function QuickStartCard({ preview, canCreate, onOpenWizard }: QuickStartCardProps) {
  const { locale, messages } = useI18n();
  const copy = messages.dashboard.quickStart;
  const [copied, setCopied] = useState(false);
  const [expired, setExpired] = useState(false);
  const ready = Boolean(preview) && !expired;
  const command = ready && preview ? preview.command : '';

  useEffect(() => {
    if (!preview) {
      setExpired(false);
      return;
    }
    const expires = Date.parse(preview.expiresAt);
    if (Number.isNaN(expires) || expires <= Date.now()) {
      setExpired(true);
      return;
    }
    setExpired(false);
    const timer = window.setTimeout(() => setExpired(true), expires - Date.now());
    return () => window.clearTimeout(timer);
  }, [preview]);

  async function copyCommand() {
    if (!ready || !preview) {
      return;
    }
    await navigator.clipboard.writeText(preview.command);
    setCopied(true);
  }

  return (
    <section
      className={`${styles.panel} ${styles.quickStartPanel}`}
      aria-labelledby="quick-start-title"
      data-testid="quick-start"
    >
      <div className={styles.panelHead}>
        <h2 id="quick-start-title">{copy.title}</h2>
      </div>
      <p className={styles.commandCaption}>{copy.commandLabel}</p>
      <div className={styles.codeField} data-disabled={ready ? undefined : 'true'}>
        <code data-testid="quick-start-command">{command}</code>
        <button
          type="button"
          className={styles.iconButton}
          disabled={!ready}
          aria-label={messages.dashboard.actions.copyCommand}
          data-testid="quick-start-copy"
          onClick={() => void copyCommand()}
        >
          <CopyIcon />
        </button>
      </div>
      {!ready ? (
        <p className={styles.cardBody}>{expired && preview ? copy.expired : copy.createFirst}</p>
      ) : null}
      {ready && preview ? (
        <p className={styles.cardBody}>
          {interpolate(copy.expires, {
            value: new Intl.DateTimeFormat(locale === 'uk' ? 'uk-UA' : 'en-GB', {
              dateStyle: 'short',
              timeStyle: 'short',
            }).format(new Date(preview.expiresAt)),
          })}
        </p>
      ) : null}
      {copied ? <p className="sr-only">{messages.dashboard.actions.copied}</p> : null}
      {canCreate ? (
        <button type="button" className={styles.wizardLink} onClick={onOpenWizard}>
          {copy.openWizard}
          <ExternalIcon />
        </button>
      ) : null}
    </section>
  );
}
