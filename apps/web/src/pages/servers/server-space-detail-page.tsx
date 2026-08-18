import { useCallback, useEffect, useState } from 'react';
import { Link, NavLink, useNavigate, useParams } from 'react-router-dom';
import { PERMISSIONS } from '@linuxpilot/auth-contracts';
import {
  SERVER_STATUSES,
  type ServerAuditEvent,
  type ServerGroup,
  type ServerSummary,
} from '@linuxpilot/server-contracts';
import { ApiRequestError } from '../../api/client';
import {
  assignServerGroup,
  getServerGroup,
  listServerAudit,
  listServers,
  updateServerGroup,
} from '../../api/servers';
import { usePermission } from '../../auth/use-permission';
import { PlusIcon } from '../../features/dashboard/icons';
import { useMediaQuery } from '../../features/dashboard/use-media-query';
import { SpaceIcon } from '../../features/groups/space-icons';
import {
  isSpaceDetailTab,
  SPACE_DETAIL_TABS,
  spacePath,
  spaceSlugOf,
  type SpaceDetailTab,
} from '../../features/groups/space-path';
import { hasInstalledAgent, ratioToPercent } from '../../features/servers/compute';
import { formatExactTime, formatLastSeen, formatPercent } from '../../features/servers/format';
import { useI18n } from '../../i18n';
import { Button } from '../../shared/ui/button';
import { EnrollmentWizard } from '../dashboard/components/enrollment-wizard';
import { EmptyState, ErrorState, LoadingSkeleton } from './components/empty-state';
import { Toast } from './components/confirm-dialog';
import { AssignServersDialog } from './components/groups/assign-servers-dialog';
import { SearchInput } from './components/search-input';
import { ServerSectionLayout } from './components/server-section-layout';
import { SpaceSettingsPanel } from './components/spaces/space-settings-panel';
import sectionStyles from './server-section.module.css';
import styles from './server-space-detail-page.module.css';

type StatusFilter = 'all' | 'ONLINE' | 'DEGRADED' | 'OFFLINE' | 'withoutAgent';
type ServerSort = 'name' | 'status' | 'lastSeen';

export function ServerSpaceDetailPage() {
  const { spaceSlug = '', tab: tabParam } = useParams<{ spaceSlug: string; tab?: string }>();
  const invalidTab = Boolean(tabParam) && !isSpaceDetailTab(tabParam);
  const tab: SpaceDetailTab = isSpaceDetailTab(tabParam) ? tabParam : 'servers';
  const { locale, messages } = useI18n();
  const navigate = useNavigate();
  const canView = usePermission(PERMISSIONS.SERVERS_VIEW);
  const canManage = usePermission(PERMISSIONS.SERVERS_UPDATE);
  const canCreateServer = usePermission(PERMISSIONS.SERVERS_CREATE);
  const isMobile = useMediaQuery('(max-width: 767px)');
  const [space, setSpace] = useState<ServerGroup | null>(null);
  const [servers, setServers] = useState<ServerSummary[]>([]);
  const [audit, setAudit] = useState<ServerAuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<'not-found' | 'network' | 'generic' | null>(null);
  const [toast, setToast] = useState('');
  const [wizardOpen, setWizardOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sort, setSort] = useState<ServerSort>('name');

  const loadSpace = useCallback(async () => {
    if (!spaceSlug || invalidTab) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const next = await getServerGroup(spaceSlug);
      setSpace(next);
    } catch (cause) {
      setSpace(null);
      if (cause instanceof ApiRequestError && cause.status === 404) {
        setError('not-found');
      } else if (cause instanceof ApiRequestError && (cause.status === 0 || cause.code === 'NETWORK_ERROR')) {
        setError('network');
      } else {
        setError('generic');
      }
    } finally {
      setLoading(false);
    }
  }, [invalidTab, spaceSlug]);

  const loadServers = useCallback(async (spaceId: string) => {
    const params = new URLSearchParams({
      page: '1',
      pageSize: '100',
      spaceId,
      sort: 'name',
      order: 'asc',
    });
    const result = await listServers(params);
    setServers(result.items);
  }, []);

  useEffect(() => {
    void loadSpace();
  }, [loadSpace]);

  useEffect(() => {
    if (!space) {
      return;
    }
    const canonical = spaceSlugOf(space);
    if (canonical !== spaceSlug) {
      navigate(spacePath(space, tab), { replace: true });
    }
  }, [navigate, space, spaceSlug, tab]);

  useEffect(() => {
    if (!space) {
      return;
    }
    let cancelled = false;
    void loadServers(space.id).catch(() => {
      if (!cancelled) {
        setServers([]);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [loadServers, space]);

  useEffect(() => {
    if (!space || (tab !== 'activity' && tab !== 'overview')) {
      return;
    }
    let cancelled = false;
    const params = new URLSearchParams({ page: '1', pageSize: '50' });
    void listServerAudit(params)
      .then((result) => {
        if (!cancelled) {
          setAudit(result.items.filter((item) => item.targetId === space.id));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAudit([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [space, tab]);

  async function toggleNotifications(enabled: boolean) {
    if (!space || !canManage) {
      return;
    }
    const updated = await updateServerGroup(space.id, {
      notificationsEnabled: enabled,
      version: space.version,
    });
    setSpace(updated);
    setToast(messages.servers.groups.detail.settingsSaved);
  }

  if (!canView) {
    return (
      <ServerSectionLayout>
        <p role="alert">{messages.servers.forbidden}</p>
      </ServerSectionLayout>
    );
  }

  const copy = messages.servers.groups;
  const detail = copy.detail;

  if (invalidTab || error === 'not-found') {
    return (
      <ServerSectionLayout>
        <div className={styles.page} data-testid="space-detail-not-found">
          <EmptyState
            title={detail.notFound}
            body={detail.notFoundBody}
            action={
              <Button onClick={() => navigate('/server-spaces')}>{detail.backToSpaces}</Button>
            }
          />
        </div>
      </ServerSectionLayout>
    );
  }

  if (loading && !space) {
    return (
      <ServerSectionLayout busy liveMessage={messages.common.status.loading}>
        <div className={styles.page} data-testid="space-detail-loading">
          <LoadingSkeleton testId="space-detail-skeleton" />
          <div className={styles.skeleton} aria-hidden="true">
            <div className={`${styles.bone} ${styles.boneHero}`} />
            <div className={styles.bone} />
            <div className={styles.bone} />
          </div>
        </div>
      </ServerSectionLayout>
    );
  }

  if (error || !space) {
    return (
      <ServerSectionLayout>
        <ErrorState
          title={error === 'network' ? copy.networkError : copy.errorTitle}
          body={messages.servers.list.errorBody}
          retryLabel={copy.retry}
          onRetry={() => void loadSpace()}
          testId="space-detail-error"
        />
      </ServerSectionLayout>
    );
  }

  const visibleServers = filterAndSortServers(servers, search, statusFilter, sort);
  const crumbs = [
    { label: messages.servers.nav, to: '/servers' },
    { label: messages.servers.section.groups, to: '/server-spaces' },
    { label: space.name, current: true },
  ];

  return (
    <ServerSectionLayout liveMessage={toast}>
      <div className={styles.page} data-testid="space-detail-page">
        <nav className={sectionStyles.breadcrumb} aria-label={messages.servers.nav}>
          {crumbs.map((crumb, index) => (
            <span key={`${crumb.label}-${index}`}>
              {index > 0 ? <span aria-hidden="true"> / </span> : null}
              {crumb.to && !crumb.current ? (
                <Link to={crumb.to}>{crumb.label}</Link>
              ) : (
                <span aria-current={crumb.current ? 'page' : undefined}>{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>
        <header className={styles.hero} style={{ ['--group-color' as string]: space.color }}>
          <div className={styles.heroMain}>
            <span className={styles.icon} aria-hidden="true">
              <SpaceIcon icon={space.icon} />
            </span>
            <div className={styles.heroCopy}>
              <h1>{space.name}</h1>
              <p>{space.description || '—'}</p>
              <span className={styles.notify}>
                {copy.notifications}:{' '}
                {space.notificationsEnabled ? copy.notificationsOn : copy.notificationsOff}
              </span>
            </div>
          </div>
          <div className={styles.heroActions}>
            {canManage ? (
              <Button
                variant="secondary"
                onClick={() => navigate(spacePath(space, 'settings'))}
                data-testid="space-edit"
              >
                {copy.edit}
              </Button>
            ) : null}
            {canCreateServer ? (
              <Button onClick={() => setWizardOpen(true)} data-testid="space-add-server">
                <PlusIcon />
                {copy.addServer}
              </Button>
            ) : null}
          </div>
        </header>

        <section className={styles.stats} aria-label={detail.stats.total}>
          <Stat label={detail.stats.total} value={String(space.serverCount)} />
          <Stat label={detail.stats.online} value={String(space.onlineCount)} />
          <Stat label={detail.stats.warning} value={String(space.warningCount)} />
          <Stat label={detail.stats.offline} value={String(space.offlineCount)} />
          <Stat label={detail.stats.withoutAgent} value={String(space.withoutAgentCount)} />
          <Stat label={detail.stats.avgCpu} value={formatPercent(space.averageCpuPercent)} />
          <Stat label={detail.stats.avgRam} value={formatPercent(space.averageMemoryPercent)} />
          <Stat label={detail.stats.avgDisk} value={formatPercent(space.averageDiskPercent)} />
        </section>

        <nav className={sectionStyles.sectionNav} aria-label={space.name}>
          {SPACE_DETAIL_TABS.map((item) => (
            <NavLink
              key={item}
              to={spacePath(space, item)}
              end={item === 'servers'}
              data-testid={`space-tab-${item}`}
              className={({ isActive }) =>
                isActive
                  ? `${sectionStyles.sectionTab} ${sectionStyles.sectionTabActive}`
                  : sectionStyles.sectionTab
              }
            >
              {detail.tabs[item]}
            </NavLink>
          ))}
        </nav>

        {tab === 'overview' ? (
          <section className={styles.overview} data-testid="space-overview">
            <dl className={styles.infoList}>
              <div>
                <dt>{copy.description}</dt>
                <dd>{space.description || '—'}</dd>
              </div>
              <div>
                <dt>{copy.notifications}</dt>
                <dd>{space.notificationsEnabled ? copy.notificationsOn : copy.notificationsOff}</dd>
              </div>
              <div>
                <dt>{detail.createdAt}</dt>
                <dd>{formatExactTime(space.createdAt, locale) || '—'}</dd>
              </div>
              <div>
                <dt>{detail.updatedAt}</dt>
                <dd>{formatExactTime(space.updatedAt, locale) || '—'}</dd>
              </div>
            </dl>
            {space.tags.length > 0 ? (
              <div className={styles.tags}>
                {space.tags.map((tag) => (
                  <span key={tag} className={styles.tag}>
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}
            <div>
              <h2>{detail.overviewMembers}</h2>
              {servers.length === 0 ? <p>{detail.overviewEmpty}</p> : null}
              {servers.slice(0, 8).map((server) => (
                <p key={server.id}>
                  <Link to={`/servers/${server.id}`}>{server.name}</Link>
                  <span className={styles.meta}>
                    {' '}
                    · {server.primaryIp || server.hostname || '—'}
                  </span>
                </p>
              ))}
            </div>
          </section>
        ) : null}

        {tab === 'servers' ? (
          <section className={styles.panel} data-testid="space-servers">
            <h2>{detail.serversTitle}</h2>
            {servers.length === 0 ? (
              <EmptyState
                title={copy.emptyGroup}
                body={detail.emptyServersBody}
                action={
                  canCreateServer ? (
                    <Button onClick={() => setWizardOpen(true)} data-testid="space-empty-add-server">
                      {copy.addServer}
                    </Button>
                  ) : canManage ? (
                    <Button onClick={() => setAssignOpen(true)}>{detail.assignExisting}</Button>
                  ) : null
                }
                testId="space-servers-empty"
              />
            ) : (
              <>
                <div className={styles.toolbar}>
                  <SearchInput
                    value={search}
                    placeholder={detail.searchServers}
                    label={detail.searchServers}
                    testId="space-servers-search"
                    onChange={setSearch}
                  />
                  <select
                    className={styles.select}
                    value={statusFilter}
                    aria-label={detail.statusFilter}
                    data-testid="space-servers-status"
                    onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
                  >
                    <option value="all">{detail.allStatuses}</option>
                    <option value={SERVER_STATUSES.ONLINE}>
                      {messages.servers.status.ONLINE}
                    </option>
                    <option value={SERVER_STATUSES.DEGRADED}>
                      {messages.servers.status.DEGRADED}
                    </option>
                    <option value={SERVER_STATUSES.OFFLINE}>
                      {messages.servers.status.OFFLINE}
                    </option>
                    <option value="withoutAgent">{detail.withoutAgentFilter}</option>
                  </select>
                  <select
                    className={styles.select}
                    value={sort}
                    aria-label={detail.sort}
                    data-testid="space-servers-sort"
                    onChange={(event) => setSort(event.target.value as ServerSort)}
                  >
                    <option value="name">{detail.sortName}</option>
                    <option value="status">{detail.sortStatus}</option>
                    <option value="lastSeen">{detail.sortLastSeen}</option>
                  </select>
                  {canManage ? (
                    <Button variant="secondary" onClick={() => setAssignOpen(true)}>
                      {detail.assignExisting}
                    </Button>
                  ) : null}
                </div>
                {visibleServers.length === 0 ? (
                  <p>{copy.filteredEmptyBody}</p>
                ) : isMobile ? (
                  <div className={styles.cards}>
                    {visibleServers.map((server) => (
                      <SpaceServerCard key={server.id} server={server} />
                    ))}
                  </div>
                ) : (
                  <div className={styles.tableWrap}>
                    <table className={styles.table} data-testid="space-servers-table">
                      <thead>
                        <tr>
                          <th>{messages.servers.list.columns.name}</th>
                          <th>{detail.hostname}</th>
                          <th>{messages.servers.list.columns.os}</th>
                          <th>{messages.servers.list.columns.status}</th>
                          <th>{messages.servers.list.columns.cpu}</th>
                          <th>{messages.servers.list.columns.ram}</th>
                          <th>{messages.servers.list.columns.disk}</th>
                          <th>{messages.servers.list.columns.lastSeen}</th>
                          <th>{messages.servers.list.actionsMenu}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {visibleServers.map((server) => (
                          <SpaceServerRow
                            key={server.id}
                            server={server}
                            canManage={canManage}
                            onRemoved={async () => {
                              await assignServerGroup(server.id, { spaceId: null });
                              setToast(copy.unassigned);
                              await loadServers(space.id);
                              await loadSpace();
                            }}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </section>
        ) : null}

        {tab === 'alerts' ? (
          <section className={styles.panel} data-testid="space-alerts">
            <h2>{detail.alertsTitle}</h2>
            <p>{detail.alertsBody}</p>
            <label>
              <input
                type="checkbox"
                checked={space.notificationsEnabled}
                disabled={!canManage}
                data-testid="space-alerts-toggle"
                onChange={(event) => void toggleNotifications(event.target.checked)}
              />
              {copy.notifications}:{' '}
              {space.notificationsEnabled ? copy.notificationsOn : copy.notificationsOff}
            </label>
          </section>
        ) : null}

        {tab === 'settings' ? (
          <SpaceSettingsPanel
            space={space}
            canManage={canManage}
            onUpdated={(updated) => {
              setSpace(updated);
              setToast(detail.settingsSaved);
            }}
          />
        ) : null}

        {tab === 'activity' ? (
          <section className={styles.panel} data-testid="space-activity">
            <h2>{copy.activityTitle}</h2>
            {audit.length === 0 ? (
              <p>{detail.activityEmpty}</p>
            ) : (
              <ul className={styles.activityList}>
                {audit.map((item) => (
                  <li key={item.id} className={styles.activityItem}>
                    <strong>{item.action}</strong>
                    <div className={styles.meta}>
                      {formatLastSeen(item.createdAt, messages.servers.list.time)}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : null}

        {canCreateServer ? (
          <EnrollmentWizard
            variant="dialog"
            open={wizardOpen}
            initialSpaceId={space.id}
            onClose={() => {
              setWizardOpen(false);
              void loadServers(space.id);
              void loadSpace();
            }}
            onIssued={() => void loadSpace()}
            onConnected={() => {
              void loadServers(space.id);
              void loadSpace();
            }}
          />
        ) : null}
        <AssignServersDialog
          open={assignOpen}
          groupId={space.id}
          onClose={() => setAssignOpen(false)}
          onAssigned={() => {
            setAssignOpen(false);
            setToast(copy.assigned);
            void loadServers(space.id);
            void loadSpace();
          }}
        />
        <Toast message={toast} />
      </div>
    </ServerSectionLayout>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <article className={styles.stat}>
      <small>{label}</small>
      <strong>{value}</strong>
    </article>
  );
}

function SpaceServerRow({
  server,
  canManage,
  onRemoved,
}: {
  server: ServerSummary;
  canManage: boolean;
  onRemoved: () => void;
}) {
  const { messages } = useI18n();
  const hasAgent = hasInstalledAgent(server);
  const ram = hasAgent ? ratioToPercent(server.memoryUsedBytes, server.memoryTotalBytes) : null;
  const disk = hasAgent ? ratioToPercent(server.diskUsedBytes, server.diskTotalBytes) : null;
  const os = [server.osName, server.osVersion].filter(Boolean).join(' ') || '—';

  return (
    <tr data-testid={`space-server-${server.id}`}>
      <td>
        <Link to={`/servers/${server.id}`}>{server.name}</Link>
      </td>
      <td>{server.primaryIp || server.hostname || '—'}</td>
      <td>{os}</td>
      <td>{messages.servers.status[server.status]}</td>
      <td>{formatPercent(hasAgent ? server.cpuUsagePercent : null)}</td>
      <td>{formatPercent(ram)}</td>
      <td>{formatPercent(disk)}</td>
      <td>{formatLastSeen(server.lastSeenAt, messages.servers.list.time)}</td>
      <td>
        <div className={styles.menu}>
          <Link to={`/servers/${server.id}`}>{messages.servers.list.bulk.open}</Link>
          {canManage ? (
            <button type="button" onClick={() => void onRemoved()}>
              {messages.servers.groups.removeFromGroup}
            </button>
          ) : null}
        </div>
      </td>
    </tr>
  );
}

function SpaceServerCard({ server }: { server: ServerSummary }) {
  const { messages } = useI18n();
  const hasAgent = hasInstalledAgent(server);
  return (
    <article className={styles.card} data-testid={`space-server-card-${server.id}`}>
      <Link to={`/servers/${server.id}`}>{server.name}</Link>
      <p className={styles.meta}>
        {server.primaryIp || server.hostname || '—'} · {messages.servers.status[server.status]}
      </p>
      <p className={styles.meta}>
        CPU {formatPercent(hasAgent ? server.cpuUsagePercent : null)} · RAM{' '}
        {formatPercent(
          hasAgent ? ratioToPercent(server.memoryUsedBytes, server.memoryTotalBytes) : null,
        )}
      </p>
    </article>
  );
}

function filterAndSortServers(
  items: ServerSummary[],
  search: string,
  status: StatusFilter,
  sort: ServerSort,
) {
  const needle = search.trim().toLowerCase();
  const filtered = items.filter((server) => {
    if (status === 'withoutAgent' && hasInstalledAgent(server)) {
      return false;
    }
    if (status !== 'all' && status !== 'withoutAgent' && server.status !== status) {
      return false;
    }
    if (!needle) {
      return true;
    }
    return [server.name, server.hostname, server.primaryIp]
      .filter(Boolean)
      .some((value) => value!.toLowerCase().includes(needle));
  });
  return [...filtered].sort((left, right) => {
    if (sort === 'status') {
      return left.status.localeCompare(right.status);
    }
    if (sort === 'lastSeen') {
      return (right.lastSeenAt ?? '').localeCompare(left.lastSeenAt ?? '');
    }
    return left.name.localeCompare(right.name);
  });
}
