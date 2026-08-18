import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { PERMISSIONS } from '@linuxpilot/auth-contracts';
import type {
  ServerAuditEvent,
  ServerDetail,
  ServerEvent,
  ServerHealth,
  ServerMetricPoint,
  ServerOperation,
  ServerUpdateStatus,
} from '@linuxpilot/server-contracts';
import {
  createServerOperation,
  deleteServer,
  endServerMaintenance,
  getServer,
  getServerAudit,
  getServerEvents,
  getServerHealth,
  getServerMetrics,
  getServerUpdates,
  listServerOperationsFor,
  revokeServer,
  rotateServerCredential,
  startServerMaintenance,
  updateServer,
} from '../../api/servers';
import { ApiRequestError } from '../../api/client';
import { usePermission } from '../../auth/use-permission';
import {
  formatBytes,
  formatPercent,
  formatRelative,
  formatUptime,
} from '../../features/servers/format';
import { Sparkline } from '../../features/servers/sparkline';
import { useI18n } from '../../i18n';
import { AppShell } from '../../shared/ui/app-shell';
import { Button } from '../../shared/ui/button';
import { TextField } from '../../shared/ui/text-field';
import { ServerSectionNav } from './components/server-section-nav';
import styles from './server-detail-page.module.css';

const TABS = ['overview', 'metrics', 'events', 'operations', 'updates', 'settings'] as const;
type Tab = (typeof TABS)[number];

export function ServerDetailPage() {
  const { id, tab } = useParams<{ id: string; tab?: string }>();
  const active: Tab = TABS.includes(tab as Tab) ? (tab as Tab) : 'overview';
  const { messages } = useI18n();
  const navigate = useNavigate();
  const canCreate = usePermission(PERMISSIONS.SERVERS_CREATE);
  const canUpdate = usePermission(PERMISSIONS.SERVERS_UPDATE);
  const canDelete = usePermission(PERMISSIONS.SERVERS_DELETE);
  const [server, setServer] = useState<ServerDetail | null>(null);
  const [metrics, setMetrics] = useState<ServerMetricPoint[]>([]);
  const [events, setEvents] = useState<ServerEvent[]>([]);
  const [audit, setAudit] = useState<ServerAuditEvent[]>([]);
  const [health, setHealth] = useState<ServerHealth | null>(null);
  const [updates, setUpdates] = useState<ServerUpdateStatus | null>(null);
  const [operations, setOperations] = useState<ServerOperation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [tabError, setTabError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [osName, setOsName] = useState('');
  const [osVersion, setOsVersion] = useState('');
  const [architecture, setArchitecture] = useState('');

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    Promise.all([getServer(id), getServerHealth(id)])
      .then(([detail, nextHealth]) => {
        if (cancelled) return;
        setServer(detail);
        setHealth(nextHealth);
        setName(detail.name);
        setOsName(detail.osName && detail.osName !== 'unknown' ? detail.osName : '');
        setOsVersion(detail.osVersion && detail.osVersion !== 'unknown' ? detail.osVersion : '');
        setArchitecture(
          detail.architecture === 'amd64' || detail.architecture === 'arm64'
            ? detail.architecture
            : '',
        );
      })
      .catch((cause) => {
        if (cancelled) return;
        setError(
          cause instanceof ApiRequestError && cause.status === 404
            ? messages.servers.detail.notFound
            : messages.errors.server,
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, messages.errors.server, messages.servers.detail.notFound]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setTabError(null);
    const load = async () => {
      try {
        if (active === 'metrics' || active === 'overview') {
          const history = await getServerMetrics(id);
          if (!cancelled) setMetrics(history.items);
        }
        if (active === 'events' || active === 'overview') {
          const next = await getServerEvents(id);
          if (!cancelled) setEvents(next.items);
        }
        if (active === 'operations') {
          const next = await listServerOperationsFor(id);
          if (!cancelled) setOperations(next.items);
        }
        if (active === 'updates') {
          const next = await getServerUpdates(id);
          if (!cancelled) setUpdates(next);
        }
        if (active === 'settings') {
          const next = await getServerAudit(id);
          if (!cancelled) setAudit(next.items);
        }
      } catch {
        if (!cancelled) setTabError(messages.errors.server);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [active, id, messages.errors.server]);

  if (id && tab && !TABS.includes(tab as Tab)) {
    return <Navigate to={`/servers/${id}/overview`} replace />;
  }

  const copy = messages.servers.detail;

  return (
    <AppShell>
      <div className={styles.page}>
        <ServerSectionNav />
        {loading ? <div className={styles.skeleton} data-testid="server-detail-loading" /> : null}
        {error ? (
          <p role="alert" data-testid="server-detail-error">
            {error}
          </p>
        ) : null}
        {server ? (
          <article data-testid="server-detail">
            <header className={styles.header}>
              <div>
                <p className={styles.eyebrow}>{copy.title}</p>
                <h1>{server.name}</h1>
                <p>
                  {messages.servers.status[server.status]} · {server.primaryIp ?? '—'} ·{' '}
                  {copy.lastSeen}: {formatRelative(server.lastSeenAt)}
                </p>
              </div>
              <div className={styles.actions}>
                {canUpdate ? (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      if (!id) return;
                      if (server.maintenanceMode) {
                        void endServerMaintenance(id).then(() => getServer(id).then(setServer));
                      } else {
                        const reason = window.prompt(copy.maintenance, 'maintenance');
                        if (reason) {
                          void startServerMaintenance(id, { reason }).then(() =>
                            getServer(id).then(setServer),
                          );
                        }
                      }
                    }}
                  >
                    {server.maintenanceMode ? copy.endMaintenance : copy.maintenance}
                  </Button>
                ) : null}
                {canCreate ? (
                  <Button
                    variant="secondary"
                    data-testid="rotate-credential"
                    onClick={() => {
                      if (id && window.confirm(copy.confirmRotate)) {
                        void rotateServerCredential(id);
                      }
                    }}
                  >
                    {copy.rotate}
                  </Button>
                ) : null}
                {canDelete ? (
                  <Button
                    variant="secondary"
                    data-testid="revoke-server"
                    onClick={() => {
                      if (id && window.confirm(copy.confirmRevoke)) {
                        void revokeServer(id).then(() => getServer(id).then(setServer));
                      }
                    }}
                  >
                    {copy.revoke}
                  </Button>
                ) : null}
                {canDelete ? (
                  <Button
                    variant="ghost"
                    data-testid="delete-server"
                    onClick={() => {
                      if (!id) return;
                      const typed = window.prompt(copy.confirmHostname);
                      if (typed && (typed === server.name || typed === server.hostname)) {
                        void deleteServer(id).then(() => navigate('/servers'));
                      }
                    }}
                  >
                    {copy.delete}
                  </Button>
                ) : null}
              </div>
            </header>

            <nav className={styles.actions} aria-label={copy.tabs.overview}>
              {TABS.map((value) => (
                <Link
                  key={value}
                  to={`/servers/${server.id}/${value}`}
                  data-testid={`server-tab-${value}`}
                  className={active === value ? styles.eyebrow : undefined}
                >
                  {copy.tabs[value]}
                </Link>
              ))}
            </nav>

            {tabError ? <p role="alert">{tabError}</p> : null}

            {active === 'overview' ? (
              <section className={styles.grid}>
                {server.systemInfoStatus === 'unknown' ? (
                  <div className={styles.systemWarning} role="status" data-testid="system-unknown">
                    <p>{copy.systemDetectFailed}</p>
                    <p>{copy.systemDetectFailedHint}</p>
                    <div className={styles.systemWarningActions}>
                      <Button
                        variant="secondary"
                        size="sm"
                        block={false}
                        data-testid="retry-system-detect"
                        onClick={() => {
                          if (id) {
                            void getServer(id).then(setServer);
                          }
                        }}
                      >
                        {copy.retrySystemDetect}
                      </Button>
                      <Link to={`/servers/${server.id}/settings`}>{copy.setSystemManually}</Link>
                    </div>
                  </div>
                ) : null}
                <Stat label={copy.health} value={health?.status ?? copy.noData} />
                <Stat
                  label={copy.os}
                  value={`${displaySystemValue(server.osName, copy.systemUnknown)} ${
                    server.osVersion && server.osVersion !== 'unknown' ? server.osVersion : ''
                  }`.trim()}
                />
                <Stat label={copy.kernel} value={server.kernelVersion ?? '—'} />
                <Stat
                  label={copy.arch}
                  value={displaySystemValue(server.architecture, copy.systemUnknown)}
                />
                <Stat label={copy.agentVersion} value={server.agentVersion ?? '—'} />
                <Stat label={copy.ip} value={server.primaryIp ?? '—'} />
                <Stat
                  label={copy.space ?? copy.group}
                  value={server.spaceName ?? server.groupName ?? copy.noSpace}
                />
                <Stat label={copy.cpu} value={formatPercent(server.cpuUsagePercent)} />
                <Stat
                  label={copy.memory}
                  value={
                    server.memoryUsedBytes && server.memoryTotalBytes
                      ? `${formatBytes(server.memoryUsedBytes)} / ${formatBytes(server.memoryTotalBytes)}`
                      : '—'
                  }
                />
                <Stat label={copy.uptime} value={formatUptime(server.uptimeSeconds)} />
                <div className={styles.stat}>
                  <Link to={`/servers/${server.id}/metrics`}>{copy.viewMetrics}</Link>
                  <Link to={`/servers/${server.id}/events`}>{copy.viewEvents}</Link>
                  <Link to={`/servers/${server.id}/updates`}>{copy.viewUpdates}</Link>
                </div>
              </section>
            ) : null}

            {active === 'metrics' ? (
              <section>
                <h2>{copy.metrics}</h2>
                {metrics.length === 0 ? (
                  <div data-testid="metrics-empty">
                    <p>{copy.metricsEmpty}</p>
                    <p>{copy.metricsEmptyHint}</p>
                  </div>
                ) : (
                  <Sparkline label="CPU" values={metrics.map((point) => point.cpuUsagePercent)} />
                )}
              </section>
            ) : null}

            {active === 'events' ? (
              <section>
                <h2>{copy.tabs.events}</h2>
                <ul data-testid="server-events">
                  {events.map((event) => (
                    <li key={event.id}>
                      {messages.servers.events[
                        event.type as keyof typeof messages.servers.events
                      ] ?? event.type}{' '}
                      · {event.createdAt}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {active === 'operations' ? (
              <section>
                <h2>{copy.tabs.operations}</h2>
                {canUpdate ? (
                  <Button
                    onClick={() => {
                      if (id) {
                        void createServerOperation(id, { type: 'REFRESH_METRICS' }).then((item) =>
                          setOperations((current) => [item, ...current]),
                        );
                      }
                    }}
                  >
                    {messages.servers.operations.retry}
                  </Button>
                ) : null}
                <ul data-testid="server-operations">
                  {operations.map((item) => (
                    <li key={item.id}>
                      {item.type} · {item.status} · {item.createdAt}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {active === 'updates' ? (
              <section>
                <h2>{copy.tabs.updates}</h2>
                <p>
                  {updates
                    ? `${updates.availableUpdates} / ${updates.securityUpdates}`
                    : copy.noData}
                </p>
                <p>{copy.packagesNotSupported}</p>
                {canUpdate ? (
                  <Button
                    onClick={() => {
                      if (id) void createServerOperation(id, { type: 'CHECK_UPDATES' });
                    }}
                  >
                    {copy.checkUpdates}
                  </Button>
                ) : null}
              </section>
            ) : null}

            {active === 'settings' ? (
              <section>
                <h2>{copy.tabs.settings}</h2>
                <TextField
                  label={messages.servers.create.name}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
                <TextField
                  label={messages.servers.create.distribution}
                  value={osName}
                  onChange={(event) => setOsName(event.target.value)}
                  data-testid="settings-os-name"
                />
                <TextField
                  label={messages.servers.create.osVersion}
                  value={osVersion}
                  onChange={(event) => setOsVersion(event.target.value)}
                  data-testid="settings-os-version"
                />
                <label className={styles.settingsLabel} htmlFor="settings-architecture">
                  {messages.servers.create.architecture}
                </label>
                <select
                  id="settings-architecture"
                  className={styles.settingsSelect}
                  value={architecture}
                  data-testid="settings-architecture"
                  onChange={(event) => setArchitecture(event.target.value)}
                >
                  <option value="">{copy.systemUnknown}</option>
                  <option value="amd64">amd64</option>
                  <option value="arm64">arm64</option>
                </select>
                {canUpdate ? (
                  <Button
                    onClick={() => {
                      if (id) {
                        void updateServer(id, {
                          name,
                          autoDetectSystem: false,
                          osName: osName.trim() || null,
                          osVersion: osVersion.trim() || null,
                          architecture:
                            architecture === 'amd64' || architecture === 'arm64'
                              ? architecture
                              : null,
                        }).then(setServer);
                      }
                    }}
                  >
                    {copy.settingsSaved}
                  </Button>
                ) : null}
                <h3>{copy.dangerZone}</h3>
                <ul data-testid="server-audit">
                  {audit.map((event) => (
                    <li key={event.id}>
                      {event.action} · {event.createdAt}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </article>
        ) : null}
      </div>
    </AppShell>
  );
}

function displaySystemValue(value: string | null, unknownLabel: string): string {
  if (!value || value.toLowerCase() === 'unknown') {
    return unknownLabel;
  }
  return value;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.stat}>
      <small>{label}</small>
      <p>{value}</p>
    </div>
  );
}
