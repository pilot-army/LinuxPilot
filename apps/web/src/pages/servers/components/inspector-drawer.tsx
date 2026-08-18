import { useEffect, useRef, type ReactNode } from 'react';
import { CloseIcon } from '../../../features/dashboard/icons';
import { useBodyScrollLock } from '../../../features/dashboard/use-body-scroll-lock';
import { useFocusTrap } from '../../../features/dashboard/use-focus-trap';
import styles from '../server-section.module.css';

type InspectorDrawerProps = {
  open: boolean;
  overlay: boolean;
  sheet: boolean;
  title: string;
  closeLabel: string;
  testId: string;
  children: ReactNode;
  onClose: () => void;
};

export function InspectorDrawer({
  open,
  overlay,
  sheet,
  title,
  closeLabel,
  testId,
  children,
  onClose,
}: InspectorDrawerProps) {
  const panelRef = useRef<HTMLElement>(null);
  useFocusTrap(open && (overlay || sheet), panelRef);
  useBodyScrollLock(open && (overlay || sheet));

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
    <>
      {overlay || sheet ? (
        <button
          type="button"
          className={styles.inspectorOverlay}
          aria-label={closeLabel}
          data-testid={`${testId}-overlay`}
          onClick={onClose}
        />
      ) : null}
      <aside
        ref={panelRef}
        className={`${styles.inspector} ${sheet ? styles.inspectorSheet : ''} ${overlay ? styles.inspectorDrawer : ''}`}
        aria-label={title}
        data-testid={testId}
      >
        <header className={styles.inspectorHead}>
          <h2>{title}</h2>
          <button type="button" className={styles.iconAction} onClick={onClose} aria-label={closeLabel}>
            <CloseIcon />
          </button>
        </header>
        {children}
      </aside>
    </>
  );
}
