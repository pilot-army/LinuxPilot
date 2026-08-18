import { useEffect, useRef, type ReactNode } from 'react';
import { useBodyScrollLock } from '../../../features/dashboard/use-body-scroll-lock';
import { useFocusTrap } from '../../../features/dashboard/use-focus-trap';
import { useI18n } from '../../../i18n';
import { Button } from '../../../shared/ui/button';
import styles from '../server-section.module.css';

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  body: ReactNode;
  confirmLabel: string;
  testId?: string;
  danger?: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  testId,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const { messages } = useI18n();
  const panelRef = useRef<HTMLDivElement>(null);
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

  if (!open) {
    return null;
  }

  return (
    <div data-testid={testId}>
      <button
        type="button"
        className={styles.inspectorOverlay}
        aria-label={messages.common.actions.close}
        onClick={onClose}
      />
      <div
        ref={panelRef}
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
      >
        <h2 id="confirm-title">{title}</h2>
        <div>{body}</div>
        <div className={styles.dialogActions}>
          <Button variant="secondary" size="sm" onClick={onClose}>
            {messages.common.actions.cancel}
          </Button>
          <Button
            size="sm"
            onClick={onConfirm}
            data-testid={testId ? `${testId}-confirm` : undefined}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function Toast({
  message,
  actions,
}: {
  message: string;
  actions?: { label: string; onClick: () => void; testId?: string }[];
}) {
  if (!message) {
    return null;
  }
  return (
    <div className={styles.toast} role="status">
      <p>{message}</p>
      {actions?.length ? (
        <div className={styles.toastActions}>
          {actions.map((action) => (
            <Button
              key={action.label}
              variant="secondary"
              size="sm"
              onClick={action.onClick}
              data-testid={action.testId}
            >
              {action.label}
            </Button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
