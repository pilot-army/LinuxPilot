import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PERMISSIONS } from '@linuxpilot/auth-contracts';
import {
  OPERATION_STATUSES,
  OPERATION_TYPES,
  type OperationStatus,
  type OperationType,
  type ServerOperation,
  type ServerSummary,
} from '@linuxpilot/server-contracts';
import { createServerOperation, listServers } from '../../api/servers';
import { usePermission } from '../../auth/use-permission';
import { OperationsIcon } from '../../features/dashboard/icons';
import { useMediaQuery } from '../../features/dashboard/use-media-query';
import {
  defaultOperationsQuery,
  parseOperationsQuery,
  serializeOperationsQuery,
  type OperationPeriod,
} from '../../features/operations/query';
import { useOperations } from '../../features/operations/use-operations';
import { formatExactTime } from '../../features/servers/format';
import { sanitizeRecord, shortenKey } from '../../features/servers/sanitize';
import { useI18n } from '../../i18n';
import { Button } from '../../shared/ui/button';
import { EmptyState, ErrorState, LoadingSkeleton } from './components/empty-state';
import { FilterButton } from './components/filter-button';
import { FilterChips } from './components/filter-chips';
import { InspectorDrawer } from './components/inspector-drawer';
import { MobileFilterSheet } from './components/mobile-filter-panel';
import { Pagination } from './components/pagination';
import { RefreshButton } from './components/refresh-button';
import { SearchInput } from './components/search-input';
import { ServerPageHeader } from './components/server-page-header';
import { ServerSectionLayout } from './components/server-section-layout';
import { ServerSectionTabs } from './components/server-section-tabs';
import { SyncStatus } from './components/sync-status';
import { Toast } from './components/confirm-dialog';
import styles from './server-section.module.css';

export function ServerOperationsPage() {
  const { locale, messages } = useI18n();
  const canView = usePermission(PERMISSIONS.SERVERS_VIEW);
  const canOperate = usePermission(PERMISSIONS.SERVERS_UPDATE);
  const [searchParams, setSearchParams] = useSearchParams();
  const query = useMemo(() => parseOperationsQuery(searchParams), [searchParams]);
  const list = useOperations(query);
  const isMobile = useMediaQuery('(max-width: 767px)');
  const isDesktop = useMediaQuery('(min-width: 1280px)');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [toast, setToast] = useState('');
  const [servers, setServers] = useState<ServerSummary[]>([]);
  const copy = messages.servers.operations;

  const patchQuery = useCallback(
    (patch: Partial<typeof query>) => {
      setSearchParams(serializeOperationsQuery({ ...query, ...patch }), { replace: true });
    },
    [query, setSearchParams],
  );

  useEffect(() => {
    void listServers(new URLSearchParams({ page: '1', pageSize: '100' }))
      .then((result) => setServers(result.items))
      .catch(() => setServers([]));
  }, []);

  if (!canView) {
    return (
      <ServerSectionLayout>
        <p role="alert">{messages.servers.forbidden}</p>
      </ServerSectionLayout>
    );
  }

  const selected = list.items.find((item) => item.id === query.operationId) ?? null;
  const inspectorOpen = Boolean(query.operationId);
  const filteredEmpty =
    list.status === 'empty' &&
    (Boolean(query.q) ||
      Boolean(query.status) ||
      Boolean(query.type) ||
      Boolean(query.serverId) ||
      Boolean(query.period));
  const liveMessage = list.refreshing
    ? messages.servers.list.syncing
    : list.status === 'loading'
      ? messages.common.status.loading
      : toast;

  return (
    <ServerSectionLayout
      testId="operations-page"
      busy={list.status === 'loading' || list.refreshing}
      liveMessage={liveMessage}
    >
      <div className={styles.page}>
        <ServerPageHeader
          crumbs={[
            { label: messages.navigation.items.home },
            { label: messages.servers.nav },
            { label: messages.servers.section.operations, current: true },
          ]}
          title={copy.title}
          subtitle={copy.subtitle}
          sync={
            <SyncStatus
              lastSuccessfulAt={list.lastSuccessfulAt}
              refreshing={list.refreshing}
              failed={list.status === 'error'}
              testId="operations-synced"
            />
          }
          actions={
            <>
              <RefreshButton
                refreshing={list.refreshing}
                onRefresh={() => void list.refresh()}
                testId="operations-refresh"
              />
              {canOperate ? (
                <Button
                  size="sm"
                  onClick={() => setCreateOpen(true)}
                  data-testid="create-operation"
                >
                  {copy.create}
                </Button>
              ) : null}
            </>
          }
        />
        <ServerSectionTabs />
        <div className={styles.summaryRow}>
          {(
            [
              ['queued', OPERATION_STATUSES.PENDING, list.counts.queued],
              ['running', OPERATION_STATUSES.RUNNING, list.counts.running],
              ['completed', OPERATION_STATUSES.SUCCEEDED, list.counts.completed],
              ['errors', OPERATION_STATUSES.FAILED, list.counts.errors],
            ] as const
          ).map(([key, status, count]) => (
            <button
              key={key}
              type="button"
              className={`${styles.summaryChip} ${query.status === status ? styles.summaryChipActive : ''}`}
              onClick={() => patchQuery({ status: query.status === status ? '' : status, page: 1 })}
            >
              {copy[key]}
              <span className={styles.summaryCount}>{count}</span>
            </button>
          ))}
        </div>
        <div className={styles.toolbar}>
          <SearchInput
            value={query.q}
            placeholder={copy.search}
            label={copy.searchLabel}
            testId="operations-search"
            onChange={(q) => patchQuery({ q, page: 1 })}
          />
          <FilterButton onClick={() => setFiltersOpen(true)} testId="operations-open-filters" />
          <div className={styles.desktopFilters}>
            <select
              className={styles.filterSelect}
              value={query.serverId}
              onChange={(event) => patchQuery({ serverId: event.target.value, page: 1 })}
              aria-label={copy.server}
            >
              <option value="">{copy.allServers}</option>
              {servers.map((server) => (
                <option key={server.id} value={server.id}>
                  {server.name}
                </option>
              ))}
            </select>
            <select
              className={styles.filterSelect}
              value={query.type}
              onChange={(event) =>
                patchQuery({ type: event.target.value as OperationType | '', page: 1 })
              }
              aria-label={copy.type}
            >
              <option value="">{copy.allTypes}</option>
              {Object.values(OPERATION_TYPES).map((value) => (
                <option key={value} value={value}>
                  {copy.types[value]}
                </option>
              ))}
            </select>
            <select
              className={styles.filterSelect}
              value={query.status}
              onChange={(event) =>
                patchQuery({ status: event.target.value as OperationStatus | '', page: 1 })
              }
              aria-label={copy.status}
            >
              <option value="">{copy.allStatuses}</option>
              {Object.values(OPERATION_STATUSES).map((value) => (
                <option key={value} value={value}>
                  {copy.statuses[value]}
                </option>
              ))}
            </select>
            <select
              className={styles.filterSelect}
              value={query.period}
              onChange={(event) =>
                patchQuery({ period: event.target.value as OperationPeriod, page: 1 })
              }
              aria-label={copy.period}
            >
              <option value="">{copy.periodAll}</option>
              <option value="24h">{copy.period24h}</option>
              <option value="7d">{copy.period7d}</option>
              <option value="30d">{copy.period30d}</option>
            </select>
          </div>
        </div>
        <FilterChips
          testId="operations-chips"
          chips={[
            query.q
              ? { id: 'q', label: query.q, onClear: () => patchQuery({ q: '', page: 1 }) }
              : null,
            query.status
              ? {
                  id: 'status',
                  label: copy.statuses[query.status],
                  onClear: () => patchQuery({ status: '', page: 1 }),
                }
              : null,
            query.type
              ? {
                  id: 'type',
                  label: copy.types[query.type],
                  onClear: () => patchQuery({ type: '', page: 1 }),
                }
              : null,
          ].filter((chip): chip is NonNullable<typeof chip> => Boolean(chip))}
          onClearAll={() => patchQuery({ ...defaultOperationsQuery, refresh: query.refresh })}
        />

        {list.status === 'loading' ? <LoadingSkeleton testId="operations-loading" /> : null}
        {list.status === 'error' ? (
          <ErrorState
            title={copy.errorTitle}
            body={list.error === 'network' ? copy.networkError : copy.errorBody}
            retryLabel={messages.servers.list.retry}
            onRetry={() => void list.refresh()}
            testId="operations-error"
          />
        ) : null}
        {list.status === 'empty' && !filteredEmpty ? (
          <EmptyState
            icon={<OperationsIcon />}
            title={copy.emptyTitle}
            body={copy.emptyBody}
            testId="operations-empty"
          />
        ) : null}
        {filteredEmpty ? (
          <EmptyState
            title={messages.servers.list.filteredEmptyTitle}
            body={messages.servers.list.filteredEmptyBody}
            action={
              <Button
                size="sm"
                variant="secondary"
                onClick={() => patchQuery({ ...defaultOperationsQuery })}
              >
                {copy.reset}
              </Button>
            }
            testId="operations-filtered-empty"
          />
        ) : null}

        {list.items.length > 0 ? (
          <div className={inspectorOpen && isDesktop ? styles.split : styles.single}>
            <div>
              {isMobile ? (
                <div className={styles.cards} data-testid="operations-cards">
                  {list.items.map((item) => (
                    <article key={item.id} className={styles.card}>
                      <div className={styles.cardMain}>
                        <strong>{copy.types[item.type]}</strong>
                        <StatusBadge status={item.status} />
                      </div>
                      <p className={styles.meta}>{item.serverName ?? item.serverId}</p>
                      <p className={styles.meta}>
                        {formatExactTime(item.createdAt, locale) || '—'} · {formatDuration(item)}
                      </p>
                      <p>{safeResult(item)}</p>
                      <button
                        type="button"
                        className={styles.ghostLink}
                        onClick={() => patchQuery({ operationId: item.id })}
                      >
                        {copy.openDetails}
                      </button>
                    </article>
                  ))}
                </div>
              ) : (
                <OperationsTable
                  items={list.items}
                  activeId={query.operationId}
                  locale={locale}
                  onOpen={(id) => patchQuery({ operationId: id })}
                />
              )}
              <Pagination
                page={query.page}
                pageSize={query.pageSize}
                total={list.total}
                shown={list.items.length}
                testId="operations-pagination"
                onPageChange={(page) => patchQuery({ page })}
                onPageSizeChange={(pageSize) => patchQuery({ pageSize, page: 1 })}
              />
            </div>
            <OperationInspector
              open={inspectorOpen}
              overlay={!isDesktop && !isMobile}
              sheet={isMobile}
              item={selected}
              canRetry={canOperate}
              onClose={() => patchQuery({ operationId: '' })}
              onRetry={async () => {
                if (!selected) return;
                try {
                  await createServerOperation(selected.serverId, { type: selected.type });
                  setToast(copy.createdToast);
                  await list.refresh();
                } catch {
                  setToast(copy.createFailed);
                }
              }}
            />
          </div>
        ) : inspectorOpen ? (
          <OperationInspector
            open
            overlay={!isDesktop}
            sheet={isMobile}
            item={selected}
            canRetry={false}
            onClose={() => patchQuery({ operationId: '' })}
            onRetry={() => undefined}
          />
        ) : null}

        <MobileFilterSheet
          open={filtersOpen}
          title={messages.servers.list.filters}
          testId="operations-filter-sheet"
          onApply={() => setFiltersOpen(false)}
          onReset={() => {
            patchQuery({ status: '', type: '', serverId: '', period: '', page: 1 });
            setFiltersOpen(false);
          }}
          onClose={() => setFiltersOpen(false)}
        >
          <label>
            {copy.status}
            <select
              className={styles.filterSelect}
              value={query.status}
              onChange={(event) =>
                patchQuery({ status: event.target.value as OperationStatus | '', page: 1 })
              }
            >
              <option value="">{copy.allStatuses}</option>
              {Object.values(OPERATION_STATUSES).map((value) => (
                <option key={value} value={value}>
                  {copy.statuses[value]}
                </option>
              ))}
            </select>
          </label>
          <label>
            {copy.type}
            <select
              className={styles.filterSelect}
              value={query.type}
              onChange={(event) =>
                patchQuery({ type: event.target.value as OperationType | '', page: 1 })
              }
            >
              <option value="">{copy.allTypes}</option>
              {Object.values(OPERATION_TYPES).map((value) => (
                <option key={value} value={value}>
                  {copy.types[value]}
                </option>
              ))}
            </select>
          </label>
        </MobileFilterSheet>
        <CreateOperationDialog
          open={createOpen}
          servers={servers}
          onClose={() => setCreateOpen(false)}
          onCreated={() => {
            setCreateOpen(false);
            setToast(copy.createdToast);
            void list.refresh();
          }}
        />
        <Toast message={toast} />
      </div>
    </ServerSectionLayout>
  );
}

function OperationsTable({
  items,
  activeId,
  locale,
  onOpen,
}: {
  items: ServerOperation[];
  activeId: string;
  locale: string;
  onOpen: (id: string) => void;
}) {
  const { messages } = useI18n();
  const copy = messages.servers.operations;
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table} data-testid="operations-table">
        <thead>
          <tr>
            <th>{copy.type}</th>
            <th>{copy.server}</th>
            <th>{copy.status}</th>
            <th>{copy.actor}</th>
            <th>{copy.created}</th>
            <th>{copy.duration}</th>
            <th>{copy.result}</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr
              key={item.id}
              className={activeId === item.id ? styles.rowActive : undefined}
              aria-selected={activeId === item.id}
              onClick={() => onOpen(item.id)}
            >
              <td>{copy.types[item.type]}</td>
              <td className={styles.truncate}>{item.serverName ?? item.serverId}</td>
              <td>
                <StatusBadge status={item.status} />
              </td>
              <td className={styles.mono}>{shortenKey(item.requestedBy)}</td>
              <td>{formatExactTime(item.createdAt, locale) || '—'}</td>
              <td>{formatDuration(item)}</td>
              <td>{safeResult(item)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function OperationInspector({
  open,
  overlay,
  sheet,
  item,
  canRetry,
  onClose,
  onRetry,
}: {
  open: boolean;
  overlay: boolean;
  sheet: boolean;
  item: ServerOperation | null;
  canRetry: boolean;
  onClose: () => void;
  onRetry: () => void;
}) {
  const { locale, messages } = useI18n();
  const copy = messages.servers.operations;
  const payload = item ? sanitizeRecord(item.payload) : {};
  const result = item ? sanitizeRecord(item.result ?? undefined) : {};
  const canRetryStatus =
    item &&
    (item.status === OPERATION_STATUSES.FAILED ||
      item.status === OPERATION_STATUSES.EXPIRED ||
      item.status === OPERATION_STATUSES.CANCELLED);

  return (
    <InspectorDrawer
      open={open}
      overlay={overlay}
      sheet={sheet}
      title={item ? copy.types[item.type] : copy.inspectorTitle}
      closeLabel={copy.closeInspector}
      testId="operations-inspector"
      onClose={onClose}
    >
      {item ? (
        <div className={styles.inspectorBody}>
          <StatusBadge status={item.status} />
          <dl className={styles.infoList}>
            <div>
              <dt>{copy.operationId}</dt>
              <dd className={styles.mono}>{shortenKey(item.id)}</dd>
            </div>
            <div>
              <dt>{copy.server}</dt>
              <dd>{item.serverName ?? item.serverId}</dd>
            </div>
            <div>
              <dt>{copy.actor}</dt>
              <dd className={styles.mono}>{shortenKey(item.requestedBy)}</dd>
            </div>
            <div>
              <dt>{copy.idempotency}</dt>
              <dd className={styles.mono}>{shortenKey(item.idempotencyKey)}</dd>
            </div>
            <div>
              <dt>{copy.duration}</dt>
              <dd>{formatDuration(item)}</dd>
            </div>
            <div>
              <dt>{copy.errorCode}</dt>
              <dd>{item.errorCode ?? '—'}</dd>
            </div>
          </dl>
          <section>
            <h3>{copy.timeline}</h3>
            <ol className={styles.timeline}>
              <li>
                <span>{copy.statuses.PENDING}</span>
                <time>{formatExactTime(item.createdAt, locale) || '—'}</time>
              </li>
              <li>
                <span>{copy.statuses.DELIVERED}</span>
                <time>{formatExactTime(item.deliveredAt, locale) || '—'}</time>
              </li>
              <li>
                <span>{copy.statuses.RUNNING}</span>
                <time>{formatExactTime(item.startedAt, locale) || '—'}</time>
              </li>
              <li>
                <span>{copy.statuses[item.status]}</span>
                <time>{formatExactTime(item.completedAt, locale) || '—'}</time>
              </li>
            </ol>
          </section>
          <section>
            <h3>{copy.payload}</h3>
            {Object.keys(payload).length === 0 && Object.keys(result).length === 0 ? (
              <p>{copy.noPayload}</p>
            ) : (
              <div className={styles.diff}>
                {Object.entries({ ...payload, ...result }).map(([key, value]) => (
                  <div key={key} className={styles.diffRow}>
                    <span>{key}</span>
                    <strong>{String(value)}</strong>
                  </div>
                ))}
              </div>
            )}
          </section>
          <div className={styles.stateActions}>
            {canRetry && canRetryStatus ? (
              <Button size="sm" onClick={onRetry}>
                {copy.retry}
              </Button>
            ) : null}
            <Link to={`/servers/${item.serverId}`} className={styles.detailsLink}>
              {copy.openServer}
            </Link>
          </div>
        </div>
      ) : (
        <p>{copy.empty}</p>
      )}
    </InspectorDrawer>
  );
}

function CreateOperationDialog({
  open,
  servers,
  onClose,
  onCreated,
}: {
  open: boolean;
  servers: ServerSummary[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const { messages } = useI18n();
  const copy = messages.servers.operations;
  const [serverId, setServerId] = useState(servers[0]?.id ?? '');
  const [type, setType] = useState<OperationType>(OPERATION_TYPES.REFRESH_METRICS);
  const [busy, setBusy] = useState(false);

  if (!open) {
    return null;
  }

  return (
    <div data-testid="create-operation-dialog">
      <button
        type="button"
        className={styles.inspectorOverlay}
        aria-label={copy.cancel}
        onClick={onClose}
      />
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-op-title"
      >
        <h2 id="create-op-title">{copy.createTitle}</h2>
        <label>
          {copy.pickServer}
          <select
            className={styles.filterSelect}
            value={serverId}
            onChange={(event) => setServerId(event.target.value)}
          >
            {servers.map((server) => (
              <option key={server.id} value={server.id}>
                {server.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          {copy.pickType}
          <select
            className={styles.filterSelect}
            value={type}
            onChange={(event) => setType(event.target.value as OperationType)}
          >
            {Object.values(OPERATION_TYPES).map((value) => (
              <option key={value} value={value}>
                {copy.types[value]}
              </option>
            ))}
          </select>
        </label>
        <div className={styles.dialogActions}>
          <Button variant="secondary" size="sm" onClick={onClose}>
            {copy.cancel}
          </Button>
          <Button
            size="sm"
            loading={busy}
            disabled={!serverId}
            onClick={() => {
              setBusy(true);
              void createServerOperation(serverId, { type })
                .then(onCreated)
                .catch(onClose)
                .finally(() => setBusy(false));
            }}
          >
            {copy.submit}
          </Button>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: OperationStatus }) {
  const { messages } = useI18n();
  return (
    <span className={`${styles.statusBadge} ${styles[`status-${status.toLowerCase()}`]}`}>
      {messages.servers.operations.statuses[status]}
    </span>
  );
}

function formatDuration(item: ServerOperation): string {
  const start = Date.parse(item.startedAt ?? item.createdAt);
  const end = item.completedAt ? Date.parse(item.completedAt) : Date.now();
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) {
    return '—';
  }
  const seconds = Math.round((end - start) / 1000);
  if (seconds < 60) {
    return `${seconds}s`;
  }
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

function safeResult(item: ServerOperation): string {
  if (item.errorCode) {
    return item.errorCode;
  }
  const result = sanitizeRecord(item.result ?? undefined);
  const keys = Object.keys(result);
  return keys.length > 0 ? String(result[keys[0] ?? '']) : '—';
}
