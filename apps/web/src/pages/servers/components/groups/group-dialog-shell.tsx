import { useEffect, useRef, type ReactNode, type RefObject } from 'react';
import { CloseIcon } from '../../../../features/dashboard/icons';
import { useBodyScrollLock } from '../../../../features/dashboard/use-body-scroll-lock';
import { useFocusTrap } from '../../../../features/dashboard/use-focus-trap';
import { useI18n } from '../../../../i18n';
import pageStyles from '../../server-groups-page.module.css';

type GroupDialogShellProps = {
  open: boolean;
  title: string;
  subtitle?: string;
  titleId?: string;
  testId: string;
  children: ReactNode;
  headerIcon?: ReactNode;
  footer?: ReactNode;
  overlayClassName?: string;
  panelClassName?: string;
  headerClassName?: string;
  headerMainClassName?: string;
  headerCopyClassName?: string;
  bodyClassName?: string;
  footerClassName?: string;
  closeClassName?: string;
  layer?: ReactNode;
  initialFocusRef?: RefObject<HTMLElement | null>;
  onClose: () => void;
};

export function GroupDialogShell({
  open,
  title,
  subtitle,
  titleId,
  testId,
  children,
  headerIcon,
  footer,
  overlayClassName,
  panelClassName,
  headerClassName,
  headerMainClassName,
  headerCopyClassName,
  bodyClassName,
  footerClassName,
  closeClassName,
  layer,
  initialFocusRef,
  onClose,
}: GroupDialogShellProps) {
  const { messages } = useI18n();
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  useFocusTrap(open, panelRef, initialFocusRef);
  useBodyScrollLock(open);

  useEffect(() => {
    if (!open) {
      return;
    }
    previousFocus.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
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
    if (open) {
      return;
    }
    previousFocus.current?.focus({ preventScroll: true });
  }, [open]);

  if (!open) {
    return null;
  }

  const headingId = titleId ?? `${testId}-title`;

  return (
    <div data-testid={testId}>
      <button
        type="button"
        className={overlayClassName ?? pageStyles.overlay}
        aria-label={messages.common.actions.close}
        onClick={onClose}
      />
      <div
        ref={panelRef}
        className={panelClassName ?? pageStyles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        data-space-dialog={panelClassName ? 'create' : undefined}
      >
        <header className={headerClassName ?? pageStyles.dialogHead}>
          {headerIcon ? (
            <div className={headerMainClassName}>
              {headerIcon}
              <div className={headerCopyClassName}>
                <h2 id={headingId}>{title}</h2>
                {subtitle ? <p>{subtitle}</p> : null}
              </div>
            </div>
          ) : (
            <h2 id={headingId}>{title}</h2>
          )}
          <button
            type="button"
            className={closeClassName ?? pageStyles.iconAction}
            onClick={onClose}
            aria-label={messages.common.actions.close}
          >
            <CloseIcon />
          </button>
        </header>
        {footer ? (
          <>
            <div className={bodyClassName ?? pageStyles.dialogBody}>{children}</div>
            <div className={footerClassName}>{footer}</div>
          </>
        ) : (
          children
        )}
        {layer}
      </div>
    </div>
  );
}
