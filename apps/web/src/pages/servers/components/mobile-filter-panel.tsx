import { useEffect, useRef, type ReactNode } from 'react';
import { useBodyScrollLock } from '../../../features/dashboard/use-body-scroll-lock';
import { useFocusTrap } from '../../../features/dashboard/use-focus-trap';
import { useI18n } from '../../../i18n';
import { Button } from '../../../shared/ui/button';
import styles from '../server-section.module.css';

type MobileFilterSheetProps = {
  open: boolean;
  title: string;
  testId?: string;
  children: ReactNode;
  onApply: () => void;
  onReset: () => void;
  onClose: () => void;
};

export function MobileFilterSheet({
  open,
  title,
  testId,
  children,
  onApply,
  onReset,
  onClose,
}: MobileFilterSheetProps) {
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
        className={styles.sheetOverlay}
        aria-label={messages.common.actions.close}
        onClick={onClose}
      />
      <div ref={panelRef} className={styles.sheet} role="dialog" aria-label={title}>
        <h2>{title}</h2>
        {children}
        <div className={styles.sheetActions}>
          <Button variant="secondary" size="sm" onClick={onReset}>
            {messages.servers.list.reset}
          </Button>
          <Button size="sm" onClick={onApply}>
            {messages.servers.list.apply}
          </Button>
        </div>
      </div>
    </div>
  );
}
