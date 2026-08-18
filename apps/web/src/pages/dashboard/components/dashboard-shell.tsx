import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { MenuIcon } from '../../../features/dashboard/icons';
import { useBodyScrollLock } from '../../../features/dashboard/use-body-scroll-lock';
import { useFocusTrap } from '../../../features/dashboard/use-focus-trap';
import { useMediaQuery } from '../../../features/dashboard/use-media-query';
import {
  persistSidebarCollapsed,
  readSidebarCollapsed,
} from '../../../features/dashboard/use-sidebar-preference';
import { useI18n } from '../../../i18n';
import { AppShell } from '../../../shared/ui/app-shell';
import { DashboardSidebar } from './dashboard-sidebar';
import styles from '../dashboard-page.module.css';

type DashboardShellProps = {
  children: ReactNode;
};

export function DashboardShell({ children }: DashboardShellProps) {
  const { messages } = useI18n();
  const [menuOpen, setMenuOpen] = useState(false);
  const [manualCollapsed, setManualCollapsed] = useState<boolean | null>(() =>
    readSidebarCollapsed(),
  );
  const isMobile = useMediaQuery('(max-width: 767px)');
  const isDesktop = useMediaQuery('(min-width: 1280px)');
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);
  const drawer = isMobile;
  const collapsed = !drawer && (manualCollapsed ?? !isDesktop);

  useFocusTrap(drawer && menuOpen, sidebarRef);
  useBodyScrollLock(drawer && menuOpen);

  const closeMenu = useCallback(() => {
    setMenuOpen(false);
    queueMicrotask(() => menuButtonRef.current?.focus({ preventScroll: true }));
  }, []);

  useEffect(() => {
    if (!drawer) {
      setMenuOpen(false);
    }
  }, [drawer]);

  useEffect(() => {
    if (!drawer || !menuOpen) {
      return;
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeMenu();
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [drawer, menuOpen, closeMenu]);

  return (
    <AppShell
      hideNav
      leading={
        <button
          ref={menuButtonRef}
          type="button"
          className={styles.menuButton}
          aria-label={
            menuOpen ? messages.dashboard.actions.closeMenu : messages.dashboard.actions.openMenu
          }
          aria-expanded={menuOpen}
          aria-controls="dashboard-sidebar"
          data-testid="dashboard-menu"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <MenuIcon />
        </button>
      }
      sidebar={
        <DashboardSidebar
          open={menuOpen}
          collapsed={collapsed}
          drawer={drawer}
          onClose={closeMenu}
          onToggleCollapse={() => {
            const next = !collapsed;
            setManualCollapsed(next);
            persistSidebarCollapsed(next);
          }}
          panelRef={sidebarRef}
        />
      }
    >
      {drawer && menuOpen ? (
        <button
          type="button"
          className={styles.overlay}
          aria-label={messages.dashboard.actions.closeMenu}
          data-testid="dashboard-overlay"
          onClick={closeMenu}
        />
      ) : null}
      {children}
    </AppShell>
  );
}
