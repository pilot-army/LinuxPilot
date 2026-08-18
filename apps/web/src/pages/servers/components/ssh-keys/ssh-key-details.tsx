import { useEffect, useRef, useState } from 'react';
import type { SshKeyDetail } from '@linuxpilot/server-contracts';
import { CloseIcon, CopyIcon } from '../../../../features/dashboard/icons';
import { useBodyScrollLock } from '../../../../features/dashboard/use-body-scroll-lock';
import { useFocusTrap } from '../../../../features/dashboard/use-focus-trap';
import { interpolate } from '../../../../features/servers/format';
import { useI18n } from '../../../../i18n';
import { Button } from '../../../../shared/ui/button';
import { SshKeyStatusBadge } from './ssh-key-status-badge';
import styles from '../../server-ssh-keys-page.module.css';

type SshKeyDetailsProps = {
  open: boolean;
  sheet: boolean;
  detail: SshKeyDetail | null;
  onClose: () => void;
  onCopyPublic: () => void;
};

export function SshKeyDetails({ open, sheet, detail, onClose, onCopyPublic }: SshKeyDetailsProps) {
  const { locale, messages } = useI18n();
  const copy = messages.servers.sshKeys;
  const panelRef = useRef<HTMLElement>(null);
  const [showPublic, setShowPublic] = useState(false);
  useFocusTrap(open, panelRef);
  useBodyScrollLock(open);

  useEffect(() => {
    if (!open) {
      return;
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    setShowPublic(false);
  }, [detail?.id]);

  if (!open || !detail) {
    return null;
  }

  return (
    <>
      <button type="button" className={styles.overlay} aria-label={copy.cancel} onClick={onClose} />
      <aside
        ref={panelRef}
        className={`${styles.inspector} ${sheet ? styles.inspectorSheet : ''}`}
        aria-label={copy.detailsTitle}
        data-testid="ssh-key-details"
      >
        <header className={styles.toolbar}>
          <h2>{detail.name}</h2>
          <button
            type="button"
            className={styles.iconButton}
            aria-label={messages.common.actions.close}
            onClick={onClose}
          >
            <CloseIcon />
          </button>
        </header>
        <SshKeyStatusBadge status={detail.status} />
        <section className={styles.section}>
          <h3>{copy.sectionGeneral}</h3>
          <p>{detail.description || copy.sourceImport}</p>
          <p className={styles.meta}>
            {copy.types[detail.type]} · {copy.algorithms[detail.algorithm]}
            {detail.keySize ? ` · ${detail.keySize}` : ''}
          </p>
          <p className={styles.mono} title={detail.fingerprint}>
            {detail.fingerprint}
          </p>
          <p className={styles.meta}>
            {copy.createdBy}: {detail.createdByUserId}
          </p>
          <p className={styles.meta}>
            {copy.lastUsed}: {detail.lastUsedAt ? format(detail.lastUsedAt, locale) : copy.never}
          </p>
          <p className={styles.meta}>
            {copy.rotatedAt}: {detail.rotatedAt ? format(detail.rotatedAt, locale) : copy.never}
          </p>
        </section>
        <section className={styles.section}>
          <h3>{copy.sectionUsage}</h3>
          {detail.usages.length === 0 ? (
            <p className={styles.meta}>{copy.usagesEmpty}</p>
          ) : (
            <ul>
              {detail.usages.map((usage) => (
                <li key={`${usage.kind}-${usage.targetId}`}>{usage.label || usage.targetId}</li>
              ))}
            </ul>
          )}
        </section>
        <section className={styles.section}>
          <h3>{copy.sectionPublic}</h3>
          <div className={styles.toolbar}>
            <Button variant="secondary" size="sm" onClick={() => setShowPublic((value) => !value)}>
              {showPublic ? copy.hidePublic : copy.showPublic}
            </Button>
            <Button variant="ghost" size="sm" onClick={onCopyPublic} aria-label={copy.copyPublic}>
              <CopyIcon />
              {copy.copyPublic}
            </Button>
            <a
              className={styles.meta}
              href={`data:text/plain;charset=utf-8,${encodeURIComponent(detail.publicKey)}`}
              download={`${detail.name}.pub`}
            >
              {copy.downloadPublic}
            </a>
          </div>
          {showPublic ? <p className={styles.mono}>{detail.publicKey}</p> : null}
        </section>
        <section className={styles.section}>
          <h3>{copy.sectionPrivate}</h3>
          <p>{copy.privateProtected}</p>
        </section>
        <section className={styles.section}>
          <h3>{copy.sectionActivity}</h3>
          <ul>
            {detail.activities.map((item) => (
              <li key={item.id}>
                {copy.activity[item.type]} · {format(item.createdAt, locale)}
              </li>
            ))}
          </ul>
        </section>
        <p className="sr-only">
          {interpolate(copy.usageLine, {
            servers: String(detail.usage.servers),
            spaces: String(detail.usage.spaces),
          })}
        </p>
      </aside>
    </>
  );
}

function format(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(value),
  );
}
