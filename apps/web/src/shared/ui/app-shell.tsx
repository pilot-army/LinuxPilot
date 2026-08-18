import type { ReactNode } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { PERMISSIONS } from '@linuxpilot/auth-contracts';
import { useAuth } from '../../auth/AuthProvider';
import { usePermission } from '../../auth/use-permission';
import { HomeIcon, LogoutIcon } from '../../features/dashboard/icons';
import { useI18n } from '../../i18n';
import { HeaderNotifications } from '../../pages/dashboard/components/header-notifications';
import { GlobalCommandBar } from '../../pages/dashboard/components/global-command-bar';
import { LanguageSwitcher } from './language-switcher';
import { Logo } from './logo';
import styles from './app-shell.module.css';

type AppShellProps = {
  children: ReactNode;
  leading?: ReactNode;
  hideNav?: boolean;
  sidebar?: ReactNode;
};

export function AppShell({ children, leading, hideNav = false, sidebar }: AppShellProps) {
  const { user, logout } = useAuth();
  const { messages } = useI18n();
  const canViewServers = usePermission(PERMISSIONS.SERVERS_VIEW);
  const dashboardChrome = Boolean(sidebar);

  return (
    <div className={sidebar ? `${styles.shell} ${styles.dashboard}` : styles.shell}>
      <header className={styles.topbar}>
        <div className={styles.brand}>
          {leading ? <div className={styles.leading}>{leading}</div> : null}
          {dashboardChrome ? (
            <nav className={styles.crumb} aria-label={messages.dashboard.breadcrumb.home}>
              <Link
                to="/dashboard"
                className={styles.crumbHome}
                aria-label={messages.dashboard.breadcrumb.home}
              >
                <HomeIcon />
              </Link>
              <span className={styles.crumbSep} aria-hidden="true">
                /
              </span>
              <span>{messages.dashboard.breadcrumb.controlCenter}</span>
            </nav>
          ) : (
            <Logo compact />
          )}
          {hideNav || dashboardChrome ? null : (
            <nav className={styles.nav} aria-label="Main">
              <NavLink to="/dashboard" className={navClass} data-testid="nav-dashboard">
                {messages.navigation.items.dashboard}
              </NavLink>
              {canViewServers ? (
                <NavLink to="/servers" className={navClass} data-testid="nav-servers">
                  {messages.navigation.items.servers}
                </NavLink>
              ) : null}
            </nav>
          )}
        </div>
        <GlobalCommandBar />
        <div className={styles.user}>
          <HeaderNotifications />
          <LanguageSwitcher />
          {user ? (
            <span className={styles.avatar} aria-hidden="true">
              {user.username.slice(0, 1).toUpperCase()}
            </span>
          ) : null}
          <div className={styles.identity}>
            <p>{user?.username}</p>
          </div>
          <button
            type="button"
            className={styles.logout}
            data-testid="sign-out"
            aria-label={messages.auth.actions.signOut}
            onClick={() => void logout()}
          >
            <LogoutIcon />
          </button>
        </div>
      </header>
      {sidebar ? (
        <div className={styles.workspace}>
          {sidebar}
          <main className={`${styles.main} ${styles.mainFlush}`}>{children}</main>
        </div>
      ) : (
        <main className={styles.main}>{children}</main>
      )}
    </div>
  );
}

function navClass({ isActive }: { isActive: boolean }) {
  return isActive ? `${styles.link} ${styles.linkActive}` : styles.link;
}
