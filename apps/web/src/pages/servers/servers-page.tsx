import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PERMISSIONS } from '@linuxpilot/auth-contracts';
import {
  SERVER_STATUSES,
  type OperationType,
  type ServerStatus,
} from '@linuxpilot/server-contracts';
import {
  bulkAssignGroup,
  bulkCreateOperations,
  bulkStartMaintenance,
  deleteServer,
  listServerGroups,
  revokeServer,
} from '../../api/servers';
import { usePermission } from '../../auth/use-permission';
import { ImportConfigurationDialog } from '../dashboard/components/import-config/import-configuration-dialog';
import { EnrollmentWizard } from '../dashboard/components/enrollment-wizard';
import { useMediaQuery } from '../../features/dashboard/use-media-query';
import { hasInstalledAgent } from '../../features/servers/compute';
import { interpolate } from '../../features/servers/format';
import {
  countActiveServersFilters,
  defaultServersQuery,
  hasActiveServersFilters,
  parseServersQuery,
  serializeServersQuery,
} from '../../features/servers/query';
import type { ListSort, PageSize, ServerLayout } from '../../features/servers/types';
import { useServerInspector } from '../../features/servers/use-server-inspector';
import { useServers } from '../../features/servers/use-servers';
import { useI18n } from '../../i18n';
import { AgentConnectionNotice } from './components/agent-connection-notice';
import { AddServerSplitButton } from './components/add-server-split-button';
import { BulkActionBar } from './components/bulk-action-bar';
import {
  BulkGroupDialog,
  BulkMaintenanceDialog,
  BulkOperationDialog,
} from './components/bulk-dialogs';
import { Toast } from './components/confirm-dialog';
import { EmptyState, ErrorState } from './components/empty-state';
import { MobileFilterSheet } from './components/mobile-filter-sheet';
import { RefreshButton } from './components/refresh-button';
import { ServerCard } from './components/server-card';
import { ServerInspector } from './components/server-inspector';
import { ServerPageHeader } from './components/server-page-header';
import { ServerPagination } from './components/server-pagination';
import { ServerSectionLayout } from './components/server-section-layout';
import { ServerTable } from './components/server-table';
import { ServerToolbar } from './components/server-toolbar';
import { ServersEmptyState } from './components/servers-empty-state';
import { ServersLoadingState } from './components/servers-loading-state';
import { ServersSummary } from './components/servers-summary';
import { SyncStatus } from './components/sync-status';
import styles from './servers-page.module.css';

export function ServersPage() {
  const { messages } = useI18n();
  const canView = usePermission(PERMISSIONS.SERVERS_VIEW);
  const canCreate = usePermission(PERMISSIONS.SERVERS_CREATE);
  const canUpdate = usePermission(PERMISSIONS.SERVERS_UPDATE);
  const canDelete = usePermission(PERMISSIONS.SERVERS_DELETE);
  const canTerminal = usePermission(PERMISSIONS.TERMINAL_OPEN);
  const [searchParams, setSearchParams] = useSearchParams();
  const query = useMemo(() => parseServersQuery(searchParams), [searchParams]);
  const list = useServers(query);
  const inspector = useServerInspector(query.serverId);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [toast, setToast] = useState('');
  const [spaces, setSpaces] = useState<{ id: string; name: string }[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [bulkDialog, setBulkDialog] = useState<'group' | 'operation' | 'maintenance' | null>(null);
  const isMobile = useMediaQuery('(max-width: 767px)');
  const isDesktop = useMediaQuery('(min-width: 1280px)');
  const isNarrow = useMediaQuery('(max-width: 1279px)');

  useEffect(() => {
    void listServerGroups()
      .then((result) =>
        setSpaces(result.items.map((space) => ({ id: space.id, name: space.name }))),
      )
      .catch(() => setSpaces([]));
  }, []);

  const patchQuery = useCallback(
    (patch: Partial<typeof query>) => {
      const next = { ...query, ...patch };
      setSearchParams(serializeServersQuery(next), { replace: true });
    },
    [query, setSearchParams],
  );

  const visibleIds = list.items.map((server) => server.id);
  const selectedVisible = selectedIds.filter((id) => visibleIds.includes(id));
  const selectedServers = list.items.filter((server) => selectedVisible.includes(server.id));
  const copy = messages.servers.list;
  const missingAgent = list.items.find((server) => !hasInstalledAgent(server));

  function toggle(id: string) {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
    );
  }

  async function runBulk(ids: string[], action: (id: string) => Promise<unknown>, success: string) {
    try {
      await Promise.all(ids.map((id) => action(id)));
      setToast(success);
      setSelectedIds((current) => current.filter((id) => !ids.includes(id)));
      await list.refresh();
    } catch {
      setToast(messages.servers.list.bulk.failed);
    }
  }

  function confirmDelete(ids: string[]) {
    if (
      window.confirm(interpolate(messages.servers.list.bulk.confirmDelete, { count: ids.length }))
    ) {
      void runBulk(
        ids,
        deleteServer,
        interpolate(messages.servers.list.bulk.deleted, { count: ids.length }),
      );
    }
  }

  function confirmRevoke(ids: string[]) {
    if (
      window.confirm(interpolate(messages.servers.list.bulk.confirmRevoke, { count: ids.length }))
    ) {
      void runBulk(
        ids,
        revokeServer,
        interpolate(messages.servers.list.bulk.revoked, { count: ids.length }),
      );
    }
  }

  async function assignGroup(groupId: string) {
    try {
      await bulkAssignGroup({ serverIds: selectedVisible, spaceId: groupId });
      setToast(interpolate(copy.bulk.assigned, { count: selectedVisible.length }));
      setSelectedIds([]);
      setBulkDialog(null);
      await list.refresh();
    } catch {
      setToast(copy.bulk.failed);
    }
  }

  async function runOperation(type: OperationType) {
    try {
      await bulkCreateOperations({ serverIds: selectedVisible, type });
      setToast(
        interpolate(copy.bulk.operationQueued, {
          count: selectedVisible.length,
          type: messages.servers.operations.types[type],
        }),
      );
      setSelectedIds([]);
      setBulkDialog(null);
      await list.refresh();
    } catch {
      setToast(copy.bulk.failed);
    }
  }

  async function startMaintenance(reason: string) {
    try {
      await bulkStartMaintenance({ serverIds: selectedVisible, reason });
      setToast(interpolate(copy.bulk.maintenanceStarted, { count: selectedVisible.length }));
      setSelectedIds([]);
      setBulkDialog(null);
      await list.refresh();
    } catch {
      setToast(copy.bulk.failed);
    }
  }

  function onSort(sort: ListSort) {
    if (query.sort === sort) {
      patchQuery({ order: query.order === 'asc' ? 'desc' : 'asc', page: 1 });
      return;
    }
    patchQuery({ sort, order: sort === 'lastSeenAt' ? 'desc' : 'asc', page: 1 });
  }

  if (!canView) {
    return (
      <ServerSectionLayout>
        <p role="alert">{messages.servers.forbidden}</p>
      </ServerSectionLayout>
    );
  }

  const useCards = isMobile || query.layout === 'grid';
  const inspectorOpen = Boolean(query.serverId);
  const isInitialLoading = list.status === 'loading' && list.lastSuccessfulAt === null;
  const isError = list.status === 'error' && list.lastSuccessfulAt === null;
  const fleetEmpty = !isInitialLoading && !isError && list.counts.all === 0;
  const showFleet = !isInitialLoading && !isError && list.counts.all > 0;
  const filteredEmpty = showFleet && list.items.length === 0;
  const canReset = hasActiveServersFilters(query);
  const filterCount = countActiveServersFilters(query);

  function resetFilters() {
    patchQuery({
      q: '',
      status: '',
      os: '',
      spaceId: '',
      agent: 'all',
      view: 'all',
      page: 1,
    });
  }

  const liveMessage = list.refreshing
    ? copy.syncing
    : isInitialLoading
      ? messages.common.status.loading
      : toast;

  return (
    <ServerSectionLayout busy={isInitialLoading || list.refreshing} liveMessage={liveMessage}>
      <div className={styles.page} data-testid="servers-page">
        <ServerPageHeader
          crumbs={[
            { label: messages.servers.nav },
            { label: messages.servers.section.servers, current: true },
          ]}
          title={copy.title}
          subtitle={copy.subtitle}
          sync={
            <SyncStatus
              lastSuccessfulAt={list.lastSuccessfulAt}
              refreshing={list.refreshing}
              failed={list.status === 'error'}
              testId="servers-synced"
            />
          }
          actions={
            <>
              <RefreshButton
                refreshing={list.refreshing}
                onRefresh={() => void list.refresh()}
                testId="servers-refresh"
              />
              {canCreate ? (
                <AddServerSplitButton
                  onAdd={() => setWizardOpen(true)}
                  onImport={() => setImportOpen(true)}
                />
              ) : null}
            </>
          }
        />

        {isInitialLoading ? <ServersLoadingState /> : null}

        {isError ? (
          <ErrorState
            title={list.error === 'network' ? copy.networkError : copy.errorTitle}
            body={copy.errorBody}
            retryLabel={copy.retry}
            onRetry={() => void list.refresh()}
            secondary={
              <Link to="/dashboard" className={styles.noticeLink}>
                {copy.checkSystem}
              </Link>
            }
            testId="servers-error"
          />
        ) : null}

        {fleetEmpty ? (
          <ServersEmptyState
            canCreate={canCreate}
            onAddServer={() => setWizardOpen(true)}
            onImport={() => setImportOpen(true)}
          />
        ) : null}

        {showFleet ? (
          <>
            <ServersSummary counts={list.counts} items={list.items} />
            <ServerToolbar
              q={query.q}
              status={query.status}
              os={query.os}
              osOptions={list.osOptions}
              spaceId={query.spaceId}
              spaces={spaces}
              agent={query.agent}
              layout={query.layout}
              canReset={canReset}
              filterCount={filterCount}
              onQueryChange={(q) => patchQuery({ q, page: 1 })}
              onStatusChange={(status: ServerStatus | '') => patchQuery({ status, page: 1 })}
              onOsChange={(os) => patchQuery({ os, page: 1 })}
              onSpaceChange={(spaceId) => patchQuery({ spaceId, page: 1 })}
              onAgentChange={(agent) => patchQuery({ agent, page: 1 })}
              onLayoutChange={(layout: ServerLayout) => patchQuery({ layout })}
              onReset={resetFilters}
              onOpenFilters={() => setFiltersOpen(true)}
            />
            <AgentConnectionNotice
              count={list.counts.noAgent}
              serverName={list.counts.noAgent === 1 ? missingAgent?.name : undefined}
              serverId={list.counts.noAgent === 1 ? missingAgent?.id : undefined}
              onDetails={() => patchQuery({ agent: 'missing', page: 1 })}
            />
            <BulkActionBar
              count={selectedVisible.length}
              canUpdate={canUpdate}
              canDelete={canDelete}
              hasGroups={spaces.length > 0}
              onRunOperation={() => setBulkDialog('operation')}
              onAddToGroup={() => setBulkDialog('group')}
              onMaintenance={() => setBulkDialog('maintenance')}
              onDelete={() => confirmDelete(selectedVisible)}
              onRevoke={() => confirmRevoke(selectedVisible)}
              onClear={() => setSelectedIds([])}
            />
          </>
        ) : null}

        {filteredEmpty ? (
          <EmptyState
            title={copy.filteredEmptyTitle}
            body={copy.filteredEmptyBody}
            action={
              <>
                <button type="button" className={styles.primaryLink} onClick={resetFilters}>
                  {copy.clearFilters}
                </button>
                {query.q ? (
                  <button
                    type="button"
                    className={styles.secondaryLink}
                    onClick={() => patchQuery({ q: '', page: 1 })}
                  >
                    {copy.clearSearch}
                  </button>
                ) : null}
              </>
            }
            testId="servers-filtered-empty"
          />
        ) : null}

        {showFleet && list.items.length > 0 ? (
          <div className={inspectorOpen && isDesktop ? styles.split : styles.single}>
            <div>
              {useCards ? (
                <div className={styles.cards} data-testid="servers-cards">
                  {list.items.map((server) => (
                    <ServerCard
                      key={server.id}
                      server={server}
                      selected={selectedIds.includes(server.id)}
                      canDelete={canDelete}
                      canUpdate={canUpdate}
                      canTerminal={canTerminal}
                      onToggle={() => toggle(server.id)}
                      onOpen={() => patchQuery({ serverId: server.id })}
                      onDelete={() => confirmDelete([server.id])}
                      onRevoke={() => confirmRevoke([server.id])}
                    />
                  ))}
                </div>
              ) : (
                <ServerTable
                  items={list.items}
                  selectedIds={selectedIds}
                  activeId={query.serverId}
                  canDelete={canDelete}
                  canUpdate={canUpdate}
                  canTerminal={canTerminal}
                  sort={query.sort}
                  order={query.order}
                  onSort={onSort}
                  onToggle={toggle}
                  onToggleAll={() =>
                    setSelectedIds((current) =>
                      visibleIds.every((id) => current.includes(id))
                        ? current.filter((id) => !visibleIds.includes(id))
                        : [...new Set([...current, ...visibleIds])],
                    )
                  }
                  onOpen={(id) => patchQuery({ serverId: id })}
                  onDelete={(id) => confirmDelete([id])}
                  onRevoke={(id) => confirmRevoke([id])}
                />
              )}
              <ServerPagination
                page={query.page}
                pageSize={query.pageSize}
                total={list.total}
                shown={list.items.length}
                onPageChange={(page) => patchQuery({ page })}
                onPageSizeChange={(pageSize: PageSize) => patchQuery({ pageSize, page: 1 })}
              />
            </div>
            <ServerInspector
              open={inspectorOpen}
              overlay={isNarrow && !isMobile}
              sheet={isMobile}
              state={inspector}
              onClose={() => patchQuery({ serverId: '' })}
              onRetry={inspector.retry}
            />
          </div>
        ) : inspectorOpen ? (
          <ServerInspector
            open
            overlay={isNarrow}
            sheet={isMobile}
            state={inspector}
            onClose={() => patchQuery({ serverId: '' })}
            onRetry={inspector.retry}
          />
        ) : null}

        <MobileFilterSheet
          open={filtersOpen}
          status={query.status}
          os={query.os}
          osOptions={list.osOptions}
          spaceId={query.spaceId}
          spaces={spaces}
          agent={query.agent}
          onStatusChange={(status) => patchQuery({ status, page: 1 })}
          onOsChange={(os) => patchQuery({ os, page: 1 })}
          onSpaceChange={(spaceId) => patchQuery({ spaceId, page: 1 })}
          onAgentChange={(agent) => patchQuery({ agent, page: 1 })}
          onApply={() => setFiltersOpen(false)}
          onReset={() => {
            patchQuery({
              q: '',
              status: '',
              os: '',
              spaceId: '',
              agent: 'all',
              view: 'all',
              sort: defaultServersQuery.sort,
              page: 1,
            });
            setFiltersOpen(false);
          }}
          onClose={() => setFiltersOpen(false)}
        />
        <BulkGroupDialog
          open={bulkDialog === 'group'}
          count={selectedVisible.length}
          groups={spaces}
          onClose={() => setBulkDialog(null)}
          onConfirm={(groupId) => void assignGroup(groupId)}
        />
        <BulkOperationDialog
          open={bulkDialog === 'operation'}
          count={selectedVisible.length}
          offlineCount={
            selectedServers.filter((server) => server.status === SERVER_STATUSES.OFFLINE).length
          }
          onClose={() => setBulkDialog(null)}
          onConfirm={(type) => void runOperation(type)}
        />
        <BulkMaintenanceDialog
          open={bulkDialog === 'maintenance'}
          count={selectedVisible.length}
          onClose={() => setBulkDialog(null)}
          onConfirm={(reason) => void startMaintenance(reason)}
        />
        <Toast message={toast} />
        {canCreate ? (
          <>
            <EnrollmentWizard
              variant="dialog"
              open={wizardOpen}
              onOpenChange={setWizardOpen}
              onClose={() => {
                setWizardOpen(false);
                void list.refresh();
              }}
              onConnected={() => {
                void list.refresh();
              }}
              onSuccess={() => {
                void list.refresh();
              }}
            />
            <ImportConfigurationDialog
              open={importOpen}
              onClose={() => setImportOpen(false)}
              onImported={() => {
                setImportOpen(false);
                void list.refresh();
              }}
            />
          </>
        ) : null}
      </div>
    </ServerSectionLayout>
  );
}
