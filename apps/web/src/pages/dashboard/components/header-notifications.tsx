import { useEffect, useId, useRef, useState } from 'react';
import { BellIcon } from '../../../features/dashboard/icons';
import { useI18n } from '../../../i18n';
import styles from '../dashboard-page.module.css';

export function HeaderNotifications() {
  const { messages } = useI18n();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();
  const copy = messages.dashboard.notifications;

  useEffect(() => {
    if (!open) {
      return;
    }
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div className={styles.headerMenu} ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        className={styles.iconButton}
        aria-label={messages.dashboard.actions.notifications}
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        data-testid="dashboard-notifications"
        onClick={() => setOpen((current) => !current)}
      >
        <BellIcon />
      </button>
      {open ? (
        <div className={styles.headerPopover} id={menuId} role="dialog" aria-label={copy.title}>
          <p className={styles.emptyTitle}>{copy.title}</p>
          <p className={styles.emptyBody}>{copy.empty}</p>
        </div>
      ) : null}
    </div>
  );
}
