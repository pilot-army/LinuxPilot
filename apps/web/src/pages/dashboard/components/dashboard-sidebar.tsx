import {
  useEffect,
  useMemo,
  useState,
  type KeyboardEvent,
  type ComponentType,
  type RefObject,
  type SVGProps,
} from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { PERMISSIONS, type PermissionCode } from '@linuxpilot/auth-contracts';
import { usePermission } from '../../../auth/use-permission';
import { useFleetPresence } from '../../../features/dashboard/fleet-presence';
import {
  CloseIcon,
  CollapseIcon,
  ExpandIcon,
  LockIcon,
  OverviewIcon,
} from '../../../features/dashboard/icons';
import {
  MICROSERVICE_NAV,
  SYSTEM_NAV,
  isPathActive,
  isServersSection,
  type NavGroup,
  type NavLeaf,
} from '../../../features/dashboard/nav-config';
import {
  persistSidebarExpanded,
  readSidebarExpanded,
} from '../../../features/dashboard/use-sidebar-preference';
import { interpolate } from '../../../features/dashboard/format';
import { useI18n } from '../../../i18n';
import { Logo } from '../../../shared/ui/logo';
import styles from '../dashboard-page.module.css';

type DashboardSidebarProps = {
  open: boolean;
  collapsed: boolean;
  drawer: boolean;
  onClose: () => void;
  onToggleCollapse: () => void;
  panelRef: RefObject<HTMLElement | null>;
};

export function DashboardSidebar({
  open,
  collapsed,
  drawer,
  onClose,
  onToggleCollapse,
  panelRef,
}: DashboardSidebarProps) {
  const { messages } = useI18n();
  const location = useLocation();
  const { hasServers, known } = useFleetPresence();
  const canViewServers = usePermission(PERMISSIONS.SERVERS_VIEW);
  const canAudit = usePermission(PERMISSIONS.AUDIT_VIEW);
  const canTerminal = usePermission(PERMISSIONS.TERMINAL_OPEN);
  const canDocker = usePermission(PERMISSIONS.DOCKER_VIEW);
  const canDatabases = usePermission(PERMISSIONS.DATABASES_VIEW);
  const canReadSshKeys = usePermission(PERMISSIONS.SSH_KEYS_READ);
  const nav = messages.dashboard.nav;
  const lockReason = known && !hasServers ? nav.addServerFirst : nav.unavailable;
  const [expanded, setExpanded] = useState<string[]>(() => readSidebarExpanded());

  useEffect(() => {
    const activeGroups = MICROSERVICE_NAV.filter((group) =>
      group.id === 'servers'
        ? isServersSection(location.pathname)
        : group.children.some((child) => isPathActive(location.pathname, child.to)),
    ).map((group) => group.id);
    if (activeGroups.length === 0) {
      return;
    }
    setExpanded((current) => {
      const missing = activeGroups.filter((id) => !current.includes(id));
      if (missing.length === 0) {
        return current;
      }
      const next = [...current, ...missing];
      persistSidebarExpanded(next);
      return next;
    });
  }, [location.pathname]);

  const permissions: Record<string, boolean> = useMemo(
    () => ({
      [PERMISSIONS.SERVERS_VIEW]: canViewServers,
      [PERMISSIONS.AUDIT_VIEW]: canAudit,
      [PERMISSIONS.TERMINAL_OPEN]: canTerminal,
      [PERMISSIONS.DOCKER_VIEW]: canDocker,
      [PERMISSIONS.DATABASES_VIEW]: canDatabases,
      [PERMISSIONS.SSH_KEYS_READ]: canReadSshKeys,
    }),
    [canAudit, canDatabases, canDocker, canReadSshKeys, canTerminal, canViewServers],
  );

  function toggleGroup(id: string) {
    setExpanded((current) => {
      const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
      persistSidebarExpanded(next);
      return next;
    });
  }

  const className = [
    styles.sidebar,
    collapsed ? styles.sidebarCollapsed : '',
    drawer ? styles.sidebarDrawer : '',
    open ? styles.sidebarOpen : '',
  ]
    .filter(Boolean)
    .join(' ');

  const collapseLabel = collapsed
    ? messages.dashboard.actions.expandSidebar
    : messages.dashboard.actions.collapseSidebar;

  return (
    <aside
      id="dashboard-sidebar"
      ref={panelRef}
      className={className}
      aria-label={nav.label}
      aria-hidden={drawer && !open ? true : undefined}
      data-testid="dashboard-sidebar"
      data-open={open ? 'true' : 'false'}
      data-collapsed={collapsed ? 'true' : 'false'}
    >
      <div className={styles.sidebarBrand}>
        <Logo compact showWordmark={!collapsed} />
        {drawer ? (
          <button
            type="button"
            className={styles.iconButton}
            onClick={onClose}
            aria-label={messages.dashboard.actions.closeMenu}
            data-testid="dashboard-menu-close"
          >
            <CloseIcon />
          </button>
        ) : null}
      </div>
      <nav className={styles.sideNav} aria-label={nav.label}>
        <NavLink
          to="/dashboard"
          data-testid="nav-dashboard"
          title={collapsed ? nav.overview : undefined}
          aria-label={collapsed ? nav.overview : undefined}
          aria-current={location.pathname === '/dashboard' ? 'page' : undefined}
          className={({ isActive }) =>
            isActive ? `${styles.sideLink} ${styles.sideLinkActive}` : styles.sideLink
          }
          onClick={drawer ? onClose : undefined}
        >
          <span className={styles.sideIconWrap}>
            <OverviewIcon className={styles.sideIcon} />
          </span>
          {collapsed ? null : <span className={styles.sideLabel}>{nav.overview}</span>}
        </NavLink>

        <p className={collapsed ? styles.sideSectionGap : styles.sideSectionLabel}>
          {collapsed ? null : nav.sections.microservices}
        </p>
        {MICROSERVICE_NAV.map((group) => (
          <MicroserviceNavigationGroup
            key={group.id}
            group={group}
            expanded={!collapsed && expanded.includes(group.id)}
            collapsed={collapsed}
            pathname={location.pathname}
            permissions={permissions}
            lockServers={!hasServers && known}
            lockReason={lockReason}
            unavailable={nav.unavailable}
            noPermission={nav.noPermission}
            labels={nav}
            onToggle={() => toggleGroup(group.id)}
            onNavigate={drawer ? onClose : undefined}
          />
        ))}

        <p className={collapsed ? styles.sideSectionGap : styles.sideSectionLabel}>
          {collapsed ? null : nav.sections.system}
        </p>
        {SYSTEM_NAV.map((item) => {
          const Icon = item.icon;
          const label = nav[item.labelKey];
          return (
            <span
              key={item.id}
              className={`${styles.sideLink} ${styles.sideLinkDisabled}`}
              aria-disabled="true"
              aria-label={`${label}. ${nav.unavailable}`}
              title={`${label}. ${nav.unavailable}`}
            >
              <span className={styles.sideIconWrap}>
                <Icon className={styles.sideIcon} />
              </span>
              {collapsed ? null : <span className={styles.sideLabel}>{label}</span>}
            </span>
          );
        })}
      </nav>
      {drawer ? null : (
        <button
          type="button"
          className={styles.collapseButton}
          onClick={onToggleCollapse}
          aria-pressed={collapsed}
          aria-label={collapseLabel}
          title={collapseLabel}
          data-testid="dashboard-sidebar-collapse"
        >
          <span className={styles.sideIconWrap}>
            {collapsed ? (
              <ExpandIcon className={styles.sideIcon} />
            ) : (
              <CollapseIcon className={styles.sideIcon} />
            )}
          </span>
          {collapsed ? null : <span className={styles.sideLabel}>{collapseLabel}</span>}
        </button>
      )}
    </aside>
  );
}

function MicroserviceNavigationGroup({
  group,
  expanded,
  collapsed,
  pathname,
  permissions,
  lockServers,
  lockReason,
  unavailable,
  noPermission,
  labels,
  onToggle,
  onNavigate,
}: {
  group: NavGroup;
  expanded: boolean;
  collapsed: boolean;
  pathname: string;
  permissions: Record<string, boolean>;
  lockServers: boolean;
  lockReason: string;
  unavailable: string;
  noPermission: string;
  labels: {
    servers: string;
    terminal: string;
    docker: string;
    files: string;
    databases: string;
    modules: Record<NavLeaf['labelKey'], string>;
  };
  onToggle: () => void;
  onNavigate?: () => void;
}) {
  const { messages } = useI18n();
  const Icon = group.icon;
  const label = labels[group.labelKey];
  const allowed = group.permission ? permissions[group.permission] !== false : true;
  const serverLocked = Boolean(group.requiresServer && lockServers);
  const children = group.children;
  const count = children.length;
  const locked = !allowed || serverLocked;
  const sectionActive =
    group.id === 'servers'
      ? isServersSection(pathname)
      : children.some((child) => isPathActive(pathname, child.to));
  const leafActive = children.some((child) => isPathActive(pathname, child.to));
  const parentActive = sectionActive && (collapsed || !expanded || !leafActive);
  const tooltip = collapsed
    ? label
    : locked
      ? `${label}. ${serverLocked ? lockReason : unavailable}`
      : undefined;

  function onParentKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onToggle();
    }
  }

  return (
    <div className={styles.navGroup} data-testid={`nav-group-${group.id}`}>
      <div className={styles.navGroupRow}>
        {group.to && allowed && !serverLocked ? (
          <Link
            to={group.to}
            data-testid={group.id === 'servers' ? 'nav-servers' : `nav-${group.id}`}
            title={tooltip}
            aria-label={collapsed ? label : undefined}
            aria-current={parentActive ? 'page' : undefined}
            className={
              parentActive ? `${styles.sideLink} ${styles.sideLinkActive}` : styles.sideLink
            }
            onClick={onNavigate}
          >
            <SideItemIcon icon={Icon} locked={false} badge={false} />
            {collapsed ? null : <span className={styles.sideLabel}>{label}</span>}
          </Link>
        ) : (
          <span
            className={`${styles.sideLink} ${locked ? styles.sideLinkDisabled : ''} ${
              parentActive ? styles.sideLinkActive : ''
            }`}
            aria-disabled={locked ? 'true' : undefined}
            aria-label={collapsed ? tooltip : undefined}
            title={tooltip}
            data-testid={group.id === 'servers' ? 'nav-servers' : `nav-${group.id}`}
          >
            <SideItemIcon icon={Icon} locked={locked} badge={collapsed} />
            {collapsed ? null : <span className={styles.sideLabel}>{label}</span>}
          </span>
        )}
        {collapsed ? null : (
          <button
            type="button"
            className={styles.navChevron}
            aria-expanded={expanded}
            aria-controls={`nav-sub-${group.id}`}
            aria-label={interpolate(
              expanded
                ? messages.dashboard.actions.collapseGroup
                : messages.dashboard.actions.expandGroup,
              { name: label },
            )}
            data-testid={`nav-toggle-${group.id}`}
            onClick={onToggle}
            onKeyDown={onParentKeyDown}
          >
            {locked ? <LockIcon className={styles.sideLock} /> : null}
            <span className={styles.navCount}>{count}</span>
            <span className={`${styles.navChevronIcon} ${expanded ? styles.navChevronOpen : ''}`}>
              ▾
            </span>
          </button>
        )}
      </div>
      {collapsed ? null : (
        <ul
          id={`nav-sub-${group.id}`}
          className={expanded ? styles.navSub : styles.navSubHidden}
          hidden={!expanded}
        >
          {children.map((child) => (
            <li key={child.id}>
              <NavLeafLink
                leaf={child}
                pathname={pathname}
                permissions={permissions}
                lockServers={lockServers}
                lockReason={lockReason}
                unavailable={unavailable}
                noPermission={noPermission}
                label={labels.modules[child.labelKey]}
                onNavigate={onNavigate}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function NavLeafLink({
  leaf,
  pathname,
  permissions,
  lockServers,
  lockReason,
  unavailable,
  noPermission,
  label,
  onNavigate,
}: {
  leaf: NavLeaf;
  pathname: string;
  permissions: Record<string, boolean>;
  lockServers: boolean;
  lockReason: string;
  unavailable: string;
  noPermission: string;
  label: string;
  onNavigate?: () => void;
}) {
  const allowed = leaf.permission ? permissions[leaf.permission] !== false : true;
  const serverLocked = Boolean(leaf.requiresServer && lockServers);
  const enabled = Boolean(leaf.available && leaf.to && allowed && !serverLocked);
  const active = isPathActive(pathname, leaf.to);
  const title = enabled
    ? undefined
    : `${label}. ${!allowed ? noPermission : serverLocked ? lockReason : unavailable}`;

  if (!enabled) {
    return (
      <span
        className={`${styles.navSubLink} ${styles.navSubLinkDisabled}`}
        aria-disabled="true"
        title={title}
        data-testid={`nav-leaf-${leaf.id}`}
      >
        <span className={styles.navBullet} aria-hidden="true" />
        <span>{label}</span>
        <LockIcon className={styles.sideLock} />
      </span>
    );
  }

  return (
    <NavLink
      to={leaf.to ?? '/'}
      data-testid={`nav-leaf-${leaf.id}`}
      className={active ? `${styles.navSubLink} ${styles.navSubLinkActive}` : styles.navSubLink}
      aria-current={active ? 'page' : undefined}
      onClick={onNavigate}
    >
      <span className={styles.navBullet} aria-hidden="true" />
      <span>{label}</span>
    </NavLink>
  );
}

function SideItemIcon({
  icon: Icon,
  locked,
  badge,
}: {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  locked: boolean;
  badge: boolean;
}) {
  return (
    <span className={styles.sideIconWrap}>
      <Icon className={styles.sideIcon} />
      {badge && locked ? <LockIcon className={styles.sideLockBadge} aria-hidden="true" /> : null}
    </span>
  );
}

export type { PermissionCode };
