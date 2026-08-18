import { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PERMISSIONS } from '@linuxpilot/auth-contracts';
import { EVENT_TYPES, type ServerAuditEvent } from '@linuxpilot/server-contracts';
import { usePermission } from '../../auth/use-permission';
import { ShieldIcon } from '../../features/dashboard/icons';
import { useMediaQuery } from '../../features/dashboard/use-media-query';
import {
  defaultAuditQuery,
  parseAuditQuery,
  serializeAuditQuery,
  type AuditPeriod,
} from '../../features/audit/query';
import { useAudit } from '../../features/audit/use-audit';
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
import styles from './server-section.module.css';

export function ServerAuditPage() {
  const { locale, messages } = useI18n();
  const canAudit = usePermission(PERMISSIONS.AUDIT_VIEW);
  const [searchParams, setSearchParams] = useSearchParams();
  const query = useMemo(() => parseAuditQuery(searchParams), [searchParams]);
  const list = useAudit(query, canAudit);
  const isMobile = useMediaQuery('(max-width: 767px)');
  const isDesktop = useMediaQuery('(min-width: 1280px)');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const copy = messages.servers.auditPage;
  const eventLabels = messages.servers.events as Record<string, string>;

  const patchQuery = useCallback(
    (patch: Partial<typeof query>) => {
      setSearchParams(serializeAuditQuery({ ...query, ...patch }), { replace: true });
    },
    [query, setSearchParams],
  );

  if (!canAudit) {
    return (
      <ServerSectionLayout>
        <div className={styles.page}>
          <ServerPageHeader
            crumbs={[
              { label: messages.navigation.items.home },
              { label: messages.servers.nav },
              { label: messages.servers.section.audit, current: true },
            ]}
            title={copy.title}
            subtitle={copy.subtitle}
            sync={<SyncStatus lastSuccessfulAt={null} />}
            actions={<span />}
          />
          <ServerSectionTabs />
          <p role="alert" data-testid="audit-forbidden">
            {copy.forbidden}
          </p>
        </div>
      </ServerSectionLayout>
    );
  }

  const selected = list.items.find((item) => item.id === query.eventId) ?? null;
  const inspectorOpen = Boolean(query.eventId);
  const filteredEmpty =
    list.status === 'empty' &&
    (Boolean(query.q) ||
      Boolean(query.action) ||
      Boolean(query.serverId) ||
      Boolean(query.period) ||
      Boolean(query.result));
  const liveMessage = list.refreshing
    ? messages.servers.list.syncing
    : list.status === 'loading'
      ? messages.common.status.loading
      : '';

  return (
    <ServerSectionLayout
      testId="audit-page"
      busy={list.status === 'loading' || list.refreshing}
      liveMessage={liveMessage}
    >
      <div className={styles.page}>
        <ServerPageHeader
          crumbs={[
            { label: messages.navigation.items.home },
            { label: messages.servers.nav },
            { label: messages.servers.section.audit, current: true },
          ]}
          title={copy.title}
          subtitle={copy.subtitle}
          sync={
            <SyncStatus
              lastSuccessfulAt={list.lastSuccessfulAt}
              refreshing={list.refreshing}
              failed={list.status === 'error'}
              testId="audit-synced"
            />
          }
          actions={
            <RefreshButton
              refreshing={list.refreshing}
              onRefresh={() => void list.refresh()}
              testId="audit-refresh"
            />
          }
        />
        <ServerSectionTabs />
        <div className={styles.securityNotice}>
          <ShieldIcon className={styles.stateIcon} />
          <div>
            <strong>{copy.noticeTitle}</strong>
            <p>{copy.noticeBody}</p>
          </div>
        </div>
        <div className={styles.toolbar}>
          <SearchInput
            value={query.q}
            placeholder={copy.search}
            label={copy.searchLabel}
            testId="audit-search"
            onChange={(q) => patchQuery({ q, page: 1 })}
          />
          <FilterButton onClick={() => setFiltersOpen(true)} testId="audit-open-filters" />
          <div className={styles.desktopFilters}>
            <select
              className={styles.filterSelect}
              value={query.action}
              onChange={(event) => patchQuery({ action: event.target.value, page: 1 })}
              aria-label={copy.action}
              data-testid="audit-action-filter"
            >
              <option value="">{copy.allActions}</option>
              {Object.values(EVENT_TYPES).map((value) => (
                <option key={value} value={value}>
                  {eventLabels[value] ?? value}
                </option>
              ))}
            </select>
            <select
              className={styles.filterSelect}
              value={query.result}
              onChange={(event) => patchQuery({ result: event.target.value, page: 1 })}
              aria-label={copy.result}
            >
              <option value="">{copy.allResults}</option>
              <option value="success">{copy.resultOk}</option>
              <option value="failure">{copy.resultFailed}</option>
            </select>
            <select
              className={styles.filterSelect}
              value={query.period}
              onChange={(event) =>
                patchQuery({ period: event.target.value as AuditPeriod, page: 1 })
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
          testId="audit-chips"
          chips={[
            query.q
              ? { id: 'q', label: query.q, onClear: () => patchQuery({ q: '', page: 1 }) }
              : null,
            query.action
              ? {
                  id: 'action',
                  label: eventLabels[query.action] ?? query.action,
                  onClear: () => patchQuery({ action: '', page: 1 }),
                }
              : null,
            query.period
              ? {
                  id: 'period',
                  label: query.period,
                  onClear: () => patchQuery({ period: '', page: 1 }),
                }
              : null,
          ].filter((chip): chip is NonNullable<typeof chip> => Boolean(chip))}
          onClearAll={() => patchQuery({ ...defaultAuditQuery, refresh: query.refresh })}
        />

        {list.status === 'loading' ? <LoadingSkeleton testId="audit-loading" /> : null}
        {list.status === 'error' ? (
          <ErrorState
            title={copy.errorTitle}
            body={list.error === 'network' ? copy.networkError : copy.errorBody}
            retryLabel={copy.retry}
            onRetry={() => void list.refresh()}
            testId="audit-error"
          />
        ) : null}
        {list.status === 'empty' && !filteredEmpty ? (
          <EmptyState
            icon={<ShieldIcon />}
            title={copy.emptyTitle}
            body={copy.emptyBody}
            testId="audit-empty"
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
                onClick={() => patchQuery({ ...defaultAuditQuery })}
              >
                {copy.reset}
              </Button>
            }
            testId="audit-filtered-empty"
          />
        ) : null}

        {list.items.length > 0 ? (
          <div className={inspectorOpen && isDesktop ? styles.split : styles.single}>
            <div>
              {isMobile ? (
                <div className={styles.cards} data-testid="audit-cards">
                  {list.items.map((item) => (
                    <article key={item.id} className={styles.card}>
                      <p className={styles.meta}>
                        {formatExactTime(item.createdAt, locale) || '—'}
                      </p>
                      <strong>{eventLabels[item.action] ?? item.action}</strong>
                      <p className={styles.meta}>
                        {item.actorId ?? copy.systemActor} ·{' '}
                        {item.targetType ?? item.targetId ?? '—'}
                      </p>
                      <span
                        className={`${styles.statusBadge} ${item.result === 'failure' ? styles['status-failed'] : styles['status-succeeded']}`}
                      >
                        {item.result === 'failure' ? copy.resultFailed : copy.resultOk}
                      </span>
                      <button
                        type="button"
                        className={styles.ghostLink}
                        onClick={() => patchQuery({ eventId: item.id })}
                      >
                        {copy.openDetails}
                      </button>
                    </article>
                  ))}
                </div>
              ) : (
                <AuditTable
                  items={list.items}
                  activeId={query.eventId}
                  locale={locale}
                  onOpen={(id) => patchQuery({ eventId: id })}
                />
              )}
              <Pagination
                page={query.page}
                pageSize={query.pageSize}
                total={list.total}
                shown={list.items.length}
                testId="audit-pagination"
                onPageChange={(page) => patchQuery({ page })}
                onPageSizeChange={(pageSize) => patchQuery({ pageSize, page: 1 })}
              />
            </div>
            <AuditInspector
              open={inspectorOpen}
              overlay={!isDesktop && !isMobile}
              sheet={isMobile}
              item={selected}
              onClose={() => patchQuery({ eventId: '' })}
            />
          </div>
        ) : inspectorOpen ? (
          <AuditInspector
            open
            overlay={!isDesktop}
            sheet={isMobile}
            item={selected}
            onClose={() => patchQuery({ eventId: '' })}
          />
        ) : null}

        <MobileFilterSheet
          open={filtersOpen}
          title={messages.servers.list.filters}
          testId="audit-filter-sheet"
          onApply={() => setFiltersOpen(false)}
          onReset={() => {
            patchQuery({ action: '', result: '', period: '', page: 1 });
            setFiltersOpen(false);
          }}
          onClose={() => setFiltersOpen(false)}
        >
          <label>
            {copy.action}
            <select
              className={styles.filterSelect}
              value={query.action}
              onChange={(event) => patchQuery({ action: event.target.value, page: 1 })}
            >
              <option value="">{copy.allActions}</option>
              {Object.values(EVENT_TYPES).map((value) => (
                <option key={value} value={value}>
                  {eventLabels[value] ?? value}
                </option>
              ))}
            </select>
          </label>
          <label>
            {copy.result}
            <select
              className={styles.filterSelect}
              value={query.result}
              onChange={(event) => patchQuery({ result: event.target.value, page: 1 })}
            >
              <option value="">{copy.allResults}</option>
              <option value="success">{copy.resultOk}</option>
              <option value="failure">{copy.resultFailed}</option>
            </select>
          </label>
        </MobileFilterSheet>
      </div>
    </ServerSectionLayout>
  );
}

function AuditTable({
  items,
  activeId,
  locale,
  onOpen,
}: {
  items: ServerAuditEvent[];
  activeId: string;
  locale: string;
  onOpen: (id: string) => void;
}) {
  const { messages } = useI18n();
  const copy = messages.servers.auditPage;
  const eventLabels = messages.servers.events as Record<string, string>;
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table} data-testid="audit-list">
        <thead>
          <tr>
            <th>{copy.timestamp}</th>
            <th>{copy.actor}</th>
            <th>{copy.action}</th>
            <th>{copy.target}</th>
            <th>{copy.server}</th>
            <th>{copy.result}</th>
            <th>{copy.correlationId}</th>
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
              <td>{formatExactTime(item.createdAt, locale) || '—'}</td>
              <td className={styles.mono}>
                {item.actorId ? shortenKey(item.actorId) : copy.systemActor}
              </td>
              <td>{eventLabels[item.action] ?? item.action}</td>
              <td className={styles.truncate}>{item.targetType ?? item.targetId ?? '—'}</td>
              <td className={styles.mono}>{item.serverId ? shortenKey(item.serverId) : '—'}</td>
              <td>
                <span
                  className={`${styles.statusBadge} ${item.result === 'failure' ? styles['status-failed'] : styles['status-succeeded']}`}
                >
                  {item.result === 'failure' ? copy.resultFailed : copy.resultOk}
                </span>
              </td>
              <td className={styles.mono}>{shortenKey(item.requestId)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AuditInspector({
  open,
  overlay,
  sheet,
  item,
  onClose,
}: {
  open: boolean;
  overlay: boolean;
  sheet: boolean;
  item: ServerAuditEvent | null;
  onClose: () => void;
}) {
  const { locale, messages } = useI18n();
  const copy = messages.servers.auditPage;
  const eventLabels = messages.servers.events as Record<string, string>;
  const metadata = item ? sanitizeRecord(item.metadata) : {};
  const before = typeof metadata.before === 'string' ? metadata.before : null;
  const after = typeof metadata.after === 'string' ? metadata.after : null;

  return (
    <InspectorDrawer
      open={open}
      overlay={overlay}
      sheet={sheet}
      title={item ? (eventLabels[item.action] ?? item.action) : copy.inspectorTitle}
      closeLabel={copy.closeInspector}
      testId="audit-inspector"
      onClose={onClose}
    >
      {item ? (
        <div className={styles.inspectorBody}>
          <dl className={styles.infoList}>
            <div>
              <dt>{copy.timestamp}</dt>
              <dd>{formatExactTime(item.createdAt, locale) || '—'}</dd>
            </div>
            <div>
              <dt>{copy.actorType}</dt>
              <dd>{item.actorId ? copy.userActor : copy.systemActor}</dd>
            </div>
            <div>
              <dt>{copy.actor}</dt>
              <dd className={styles.mono}>
                {item.actorId ? shortenKey(item.actorId) : copy.systemActor}
              </dd>
            </div>
            <div>
              <dt>{copy.action}</dt>
              <dd>{eventLabels[item.action] ?? item.action}</dd>
            </div>
            <div>
              <dt>{copy.target}</dt>
              <dd>{item.targetType ?? item.targetId ?? '—'}</dd>
            </div>
            <div>
              <dt>{copy.server}</dt>
              <dd className={styles.mono}>{item.serverId ? shortenKey(item.serverId) : '—'}</dd>
            </div>
            <div>
              <dt>{copy.result}</dt>
              <dd>{item.result === 'failure' ? copy.resultFailed : copy.resultOk}</dd>
            </div>
            <div>
              <dt>{copy.correlationId}</dt>
              <dd className={styles.mono}>{shortenKey(item.requestId)}</dd>
            </div>
          </dl>
          <section>
            <h3>{copy.metadata}</h3>
            {Object.keys(metadata).length === 0 ? (
              <p>{copy.noMetadata}</p>
            ) : (
              <div className={styles.diff}>
                {Object.entries(metadata)
                  .filter(([key]) => key !== 'before' && key !== 'after')
                  .map(([key, value]) => (
                    <div key={key} className={styles.diffRow}>
                      <span>{key}</span>
                      <strong>{String(value)}</strong>
                    </div>
                  ))}
              </div>
            )}
          </section>
          {before || after ? (
            <section>
              <h3>{copy.diff}</h3>
              <div className={styles.diff}>
                {before ? (
                  <div className={styles.diffRow}>
                    <span>before</span>
                    <strong>{before}</strong>
                  </div>
                ) : null}
                {after ? (
                  <div className={styles.diffRow}>
                    <span>after</span>
                    <strong>{after}</strong>
                  </div>
                ) : null}
              </div>
            </section>
          ) : null}
        </div>
      ) : (
        <p>{copy.empty}</p>
      )}
    </InspectorDrawer>
  );
}
