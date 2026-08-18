import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  countServerFilters,
  DASHBOARD_SERVER_LIMIT,
  filterDashboardServers,
} from '../../../features/dashboard/compute';
import type {
  DashboardServer,
  ServerFilter,
  WidgetResult,
} from '../../../features/dashboard/types';
import { useI18n } from '../../../i18n';
import { DashboardEmptyState } from './dashboard-empty-state';
import { DashboardErrorState } from './dashboard-error-state';
import { ServerFilters } from './server-filters';
import { ServerRow } from './server-row';
import styles from '../dashboard-page.module.css';

type ServerOverviewProps = {
  result: WidgetResult<DashboardServer[]>;
  canCreate: boolean;
  canDelete: boolean;
  onRetry: () => void;
  onDelete: (server: DashboardServer) => void;
};

export function ServerOverview({
  result,
  canCreate,
  canDelete,
  onRetry,
  onDelete,
}: ServerOverviewProps) {
  const { messages } = useI18n();
  const copy = messages.dashboard.servers;
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<ServerFilter>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const servers = result.data ?? [];
  const counts = useMemo(() => countServerFilters(servers), [servers]);
  const visible = useMemo(
    () =>
      filterDashboardServers(servers, filter, query, messages.dashboard.status).slice(
        0,
        DASHBOARD_SERVER_LIMIT,
      ),
    [servers, filter, query, messages.dashboard.status],
  );

  return (
    <section
      className={styles.panel}
      aria-labelledby="dashboard-servers-title"
      data-testid="dashboard-servers"
    >
      <div className={styles.panelHead}>
        <h2 id="dashboard-servers-title">{copy.title}</h2>
      </div>
      {result.status === 'error' ? (
        <DashboardErrorState
          title={copy.errorTitle}
          body={copy.errorBody}
          retryLabel={messages.dashboard.actions.retry}
          onRetry={onRetry}
          compact
        />
      ) : null}
      {result.status === 'empty' ? (
        <DashboardEmptyState
          title={copy.emptyTitle}
          body={copy.emptyBody}
          action={
            canCreate ? (
              <Link to="/servers/new" className={styles.textLink}>
                {messages.dashboard.actions.addServer}
              </Link>
            ) : null
          }
        />
      ) : null}
      {result.status === 'success' ? (
        <>
          <ServerFilters
            query={query}
            filter={filter}
            counts={counts}
            onQueryChange={setQuery}
            onFilterChange={setFilter}
          />
          {visible.length === 0 ? (
            <DashboardEmptyState title={copy.emptyFilterTitle} body={copy.emptyFilterBody} />
          ) : (
            <>
              <div className={styles.serverTableHead} aria-hidden="true">
                <div className={styles.serverTableCols}>
                  <span>{copy.columns.server}</span>
                  <span>{copy.columns.status}</span>
                  <span>{copy.columns.cpu}</span>
                  <span>{copy.columns.ram}</span>
                  <span>{copy.columns.disk}</span>
                  <span>{copy.columns.uptime}</span>
                </div>
                <span />
              </div>
              <ul className={styles.serverList}>
                {visible.map((server) => (
                  <li key={server.id}>
                    <ServerRow
                      server={server}
                      selected={selectedId === server.id}
                      canDelete={canDelete}
                      onSelect={() => setSelectedId(server.id)}
                      onDelete={onDelete}
                    />
                  </li>
                ))}
              </ul>
            </>
          )}
          <Link to="/servers" className={styles.panelFooter}>
            {messages.dashboard.actions.viewAllServers}
          </Link>
        </>
      ) : null}
    </section>
  );
}

export { ServerOverview as ServerList };
