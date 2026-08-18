import { useI18n } from '../../../../i18n';
import { Button } from '../../../../shared/ui/button';
import styles from './enrollment-wizard.module.css';

type UnsavedChangesDialogProps = {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel?: string;
  confirmTestId?: string;
  dialogTestId?: string;
  onContinue: () => void;
  onConfirm: () => void;
};

export function UnsavedChangesDialog({
  open,
  title,
  body,
  confirmLabel,
  cancelLabel,
  confirmTestId = 'confirm-close-wizard',
  dialogTestId,
  onContinue,
  onConfirm,
}: UnsavedChangesDialogProps) {
  const { messages } = useI18n();
  if (!open) {
    return null;
  }
  return (
    <div
      className={styles.confirm}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="unsaved-title"
      data-testid={dialogTestId}
    >
      <div className={styles.confirmPanel}>
        <h2 id="unsaved-title">{title}</h2>
        <p>{body}</p>
        <div className={styles.confirmActions}>
          <Button type="button" variant="secondary" block={false} onClick={onContinue}>
            {cancelLabel ?? messages.servers.create.unsavedContinue}
          </Button>
          <Button type="button" block={false} data-testid={confirmTestId} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
