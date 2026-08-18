import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { CloseIcon } from '../../../features/dashboard/icons';
import { useBodyScrollLock } from '../../../features/dashboard/use-body-scroll-lock';
import { useFocusTrap } from '../../../features/dashboard/use-focus-trap';
import { ratioToPercent } from '../../../features/servers/compute';
import { formatExactTime, formatLastSeen, formatUptime } from '../../../features/servers/format';
import type { InspectorState } from '../../../features/servers/types';
import { useI18n } from '../../../i18n';
import { Button } from '../../../shared/ui/button';
import { ServerResources } from './server-resources';
import styles from '../servers-page.module.css';

type ServerInspectorProps = {
  open: boolean;
  overlay: boolean;
  sheet: boolean;
  state: InspectorState;
  onClose: () => void;
  onRetry: () => void;
};

export function ServerInspector({
  open,
  overlay,
  sheet,
  state,
  onClose,
  onRetry,
}: ServerInspectorProps) {
  const { locale, messages } = useI18n();
  const copy = messages.servers.list.inspector;
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

  const server = state.server;
  const actions = messages.dashboard.activity.actions as Record<string, string>;

  return (
    <>
      {overlay ? (
        <button
          type="button"
          className={styles.inspectorOverlay}
          aria-label={copy.close}
          data-testid="servers-inspector-overlay"
          onClick={onClose}
        />
      ) : null}
      <aside
        ref={panelRef}
        className={`${styles.inspector} ${sheet ? styles.inspectorSheet : ''} ${overlay ? styles.inspectorDrawer : ''}`}
        aria-label={copy.title}
        data-testid="servers-inspector"
      >
        <header className={styles.inspectorHead}>
          <div>
            <h2>{server?.hostname ?? server?.name ?? copy.title}</h2>
            {server ? (
              <p>
                {messages.servers.status[server.status]}
                {server.osName ? ` · ${server.osName}` : ''}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            className={styles.iconAction}
            onClick={onClose}
            aria-label={copy.close}
          >
            <CloseIcon />
          </button>
        </header>

        {state.status === 'loading' ? <div className={styles.inspectorSkeleton} /> : null}
        {state.status === 'error' ? (
          <div className={styles.inspectorError} role="alert">
            <p>{messages.servers.list.errorTitle}</p>
            <Button variant="secondary" onClick={onRetry}>
              {copy.retry}
            </Button>
          </div>
        ) : null}

        {state.status === 'success' && server ? (
          <div className={styles.inspectorBody}>
            <Link to={`/servers/${server.id}`} className={styles.primaryLink}>
              {messages.servers.list.bulk.open}
            </Link>
            <section>
              <h3>{copy.resources}</h3>
              {server.cpuUsagePercent === null &&
              server.memoryTotalBytes === null &&
              server.diskTotalBytes === null ? (
                <p>{copy.noData}</p>
              ) : (
                <ServerResources
                  cpu={server.cpuUsagePercent}
                  ram={ratioToPercent(server.memoryUsedBytes, server.memoryTotalBytes)}
                  disk={ratioToPercent(server.diskUsedBytes, server.diskTotalBytes)}
                />
              )}
            </section>
            <section>
              <h3>{copy.info}</h3>
              <dl className={styles.infoList}>
                <div>
                  <dt>{copy.hostname}</dt>
                  <dd>{server.hostname ?? '—'}</dd>
                </div>
                <div>
                  <dt>{copy.ip}</dt>
                  <dd>{server.primaryIp ?? '—'}</dd>
                </div>
                <div>
                  <dt>{copy.os}</dt>
                  <dd>{server.osName ?? '—'}</dd>
                </div>
                <div>
                  <dt>{copy.agent}</dt>
                  <dd>{server.agentVersion ?? messages.servers.list.agentMissing}</dd>
                </div>
                <div>
                  <dt>{copy.status}</dt>
                  <dd>{messages.servers.status[server.status]}</dd>
                </div>
                <div>
                  <dt>{copy.space ?? copy.group}</dt>
                  <dd>{server.spaceName ?? server.groupName ?? messages.servers.create.noSpace}</dd>
                </div>
                <div>
                  <dt>{copy.tags}</dt>
                  <dd>{server.tags.join(', ') || '—'}</dd>
                </div>
                <div>
                  <dt>{copy.uptime}</dt>
                  <dd>{formatUptime(server.uptimeSeconds)}</dd>
                </div>
                <div>
                  <dt>{messages.servers.list.columns.lastSeen}</dt>
                  <dd>{formatLastSeen(server.lastSeenAt, messages.servers.list.time)}</dd>
                </div>
                <div>
                  <dt>{copy.added}</dt>
                  <dd>{formatExactTime(server.createdAt, locale) || '—'}</dd>
                </div>
              </dl>
            </section>
            <section>
              <h3>{copy.lastEvent}</h3>
              {state.lastEvent ? (
                <p>
                  {actions[state.lastEvent.action] ?? state.lastEvent.action}
                  <small>
                    {' '}
                    · {formatLastSeen(state.lastEvent.createdAt, messages.servers.list.time)}
                  </small>
                </p>
              ) : (
                <p>{copy.noEvent}</p>
              )}
            </section>
            <Link to={`/servers/${server.id}`} className={styles.detailsLink}>
              {copy.openDetails} →
            </Link>
          </div>
        ) : null}
      </aside>
    </>
  );
}
