import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PERMISSIONS } from '@linuxpilot/auth-contracts';
import type { ServerGroup } from '@linuxpilot/server-contracts';
import { usePermission } from '../../auth/use-permission';
import { PlusIcon } from '../../features/dashboard/icons';
import { useMediaQuery } from '../../features/dashboard/use-media-query';
import { resolveSpacesPageMode, uniqueSpaceTags } from '../../features/groups/compute';
import {
  persistGroupsLayout,
  parseGroupsQuery,
  serializeGroupsQuery,
} from '../../features/groups/query';
import { SPACES_SCROLL_KEY, spacePath } from '../../features/groups/space-path';
import type { GroupFilter, GroupLayout, GroupSort } from '../../features/groups/types';
import { useServerGroups } from '../../features/groups/use-server-groups';
import { useUngroupedServers } from '../../features/groups/use-ungrouped-servers';
import { useI18n } from '../../i18n';
import { Button } from '../../shared/ui/button';
import { EnrollmentWizard } from '../dashboard/components/enrollment-wizard';
import { ImportConfigurationDialog } from '../dashboard/components/import-config/import-configuration-dialog';
import { EmptyState, ErrorState } from './components/empty-state';
import { Toast } from './components/confirm-dialog';
import { AssignServersDialog } from './components/groups/assign-servers-dialog';
import { CreateGroupDialog } from './components/groups/create-group-dialog';
import { DeleteGroupDialog } from './components/groups/delete-group-dialog';
import { EditGroupDialog } from './components/groups/edit-group-dialog';
import { GroupBulkActions } from './components/groups/group-bulk-actions';
import { GroupsGrid } from './components/groups/groups-grid';
import { GroupsList } from './components/groups/groups-list';
import { GroupsSummary } from './components/groups/groups-summary';
import { GroupsToolbar } from './components/groups/groups-toolbar';
import { MobileGroupsFilterSheet } from './components/groups/mobile-groups-filter-sheet';
import { UngroupedServersNotice } from './components/groups/ungrouped-servers-notice';
import { RefreshButton } from './components/refresh-button';
import { ServerPageHeader } from './components/server-page-header';
import { ServerSectionLayout } from './components/server-section-layout';
import { NoServersState } from './components/spaces/no-servers-state';
import { NoSpacesState } from './components/spaces/no-spaces-state';
import { ServerSpacesSkeleton } from './components/spaces/server-spaces-skeleton';
import {
  SpacesAssignmentRules,
  SpacesRecentActivity,
} from './components/spaces/spaces-side-panels';
import { SyncStatus } from './components/sync-status';
import styles from './server-spaces-page.module.css';

export function ServerSpacesPage() {
  const { messages } = useI18n();
  const canView = usePermission(PERMISSIONS.SERVERS_VIEW);
  const canManage = usePermission(PERMISSIONS.SERVERS_UPDATE);
  const canCreateServer = usePermission(PERMISSIONS.SERVERS_CREATE);
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const query = useMemo(() => parseGroupsQuery(searchParams), [searchParams]);
  const list = useServerGroups(query);
  const ungroupedServers = useUngroupedServers(list.ungroupedCount, list.lastSuccessfulAt);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [ungroupedSelected, setUngroupedSelected] = useState<string[]>([]);
  const [toast, setToast] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createServerIds, setCreateServerIds] = useState<string[]>([]);
  const [editId, setEditId] = useState('');
  const [assignId, setAssignId] = useState('');
  const [distributeOpen, setDistributeOpen] = useState(false);
  const [deleteIds, setDeleteIds] = useState<string[]>([]);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const isMobile = useMediaQuery('(max-width: 767px)');

  const patchQuery = useCallback(
    (patch: Partial<typeof query>) => {
      const next = { ...query, ...patch };
      if (patch.layout) {
        persistGroupsLayout(patch.layout);
      }
      setSearchParams(serializeGroupsQuery(next), { replace: true, preventScrollReset: true });
    },
    [query, setSearchParams],
  );

  useLayoutEffect(() => {
    const saved = sessionStorage.getItem(SPACES_SCROLL_KEY);
    if (!saved) {
      return;
    }
    try {
      window.scrollTo(0, Number(saved));
    } catch {
      // jsdom does not implement scrollTo.
    }
  }, []);

  useEffect(() => {
    if (searchParams.has('spaceId') || searchParams.has('groupId')) {
      setSearchParams(serializeGroupsQuery(query), { replace: true, preventScrollReset: true });
    }
  }, [query, searchParams, setSearchParams]);

  useEffect(() => {
    function persist() {
      sessionStorage.setItem(SPACES_SCROLL_KEY, String(window.scrollY));
    }
    window.addEventListener('pagehide', persist);
    return () => {
      persist();
      window.removeEventListener('pagehide', persist);
    };
  }, []);

  function toggle(id: string) {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
    );
  }

  function toggleUngrouped(id: string) {
    setUngroupedSelected((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
    );
  }

  function openCreate(serverIds: string[] = []) {
    setCreateServerIds(serverIds);
    setCreateOpen(true);
  }

  function openSpace(space: { id: string; slug?: string | null }) {
    sessionStorage.setItem(SPACES_SCROLL_KEY, String(window.scrollY));
    navigate(spacePath(space));
  }

  if (!canView) {
    return (
      <ServerSectionLayout>
        <p role="alert">{messages.servers.forbidden}</p>
      </ServerSectionLayout>
    );
  }

  const copy = messages.servers.groups;
  const useCards = isMobile || query.layout === 'grid';
  const isInitialLoading = list.status === 'loading' && !list.lastSuccessfulAt;
  const isError = list.status === 'error' && !list.lastSuccessfulAt;
  const hasFilters = Boolean(query.q) || query.filter !== 'all' || Boolean(query.tag);
  const mode = resolveSpacesPageMode({
    loading: isInitialLoading,
    error: isError,
    spaceCount: list.items.length,
    visibleCount: list.visible.length,
    ungroupedCount: list.ungroupedCount,
    hasFilters,
  });
  const liveMessage = list.refreshing
    ? messages.servers.list.refreshing
    : isInitialLoading
      ? messages.common.status.loading
      : toast;
  const editGroup = list.items.find((group) => group.id === editId);
  const selectedVisible = selectedIds.filter((id) => list.visible.some((group) => group.id === id));
  const selectedSpace = list.items.find((group) => group.id === selectedVisible[0]);
  const tags = uniqueSpaceTags(list.items);

  return (
    <ServerSectionLayout busy={isInitialLoading || list.refreshing} liveMessage={liveMessage}>
      <div className={styles.page} data-testid="server-groups-page">
        <ServerPageHeader
          crumbs={[
            { label: messages.servers.nav },
            { label: messages.servers.section.groups, current: true },
          ]}
          title={copy.title}
          subtitle={copy.subtitle}
          sync={
            <SyncStatus
              lastSuccessfulAt={list.lastSuccessfulAt}
              refreshing={list.refreshing}
              failed={list.status === 'error'}
              testId="groups-synced"
            />
          }
          actions={
            <>
              <RefreshButton
                refreshing={list.refreshing}
                onRefresh={() => void list.refresh()}
                testId="groups-refresh"
              />
              {canManage ? (
                <Button size="sm" onClick={() => openCreate()} data-testid="create-group">
                  <PlusIcon />
                  {copy.create}
                </Button>
              ) : null}
            </>
          }
        />

        {mode === 'loading' ? <ServerSpacesSkeleton /> : null}
        {mode === 'error' ? (
          <ErrorState
            title={list.error === 'network' ? copy.networkError : copy.errorTitle}
            body={messages.servers.list.errorBody}
            retryLabel={copy.retry}
            onRetry={() => void list.refresh()}
            testId="groups-error"
          />
        ) : null}
        {mode === 'no-servers' ? (
          <NoServersState
            canCreateServer={canCreateServer}
            onAddServer={() => setWizardOpen(true)}
            onImport={() => setImportOpen(true)}
          />
        ) : null}
        {mode === 'no-spaces' ? (
          <NoSpacesState
            servers={ungroupedServers}
            canManage={canManage}
            onCreate={(serverIds) => openCreate(serverIds)}
          />
        ) : null}
        {mode === 'filtered-empty' ? (
          <EmptyState
            title={copy.filteredEmptyTitle}
            body={copy.filteredEmptyBody}
            action={
              <Button
                variant="secondary"
                size="sm"
                onClick={() => patchQuery({ q: '', filter: 'all', tag: '' })}
              >
                {copy.resetFilters}
              </Button>
            }
            testId="groups-filtered-empty"
          />
        ) : null}

        {mode === 'workspace' ? (
          <>
            <GroupsToolbar
              q={query.q}
              filter={query.filter}
              tag={query.tag}
              tags={tags}
              sort={query.sort}
              layout={query.layout}
              onQueryChange={(q) => patchQuery({ q })}
              onFilterChange={(filter: GroupFilter) => patchQuery({ filter })}
              onTagChange={(tag) => patchQuery({ tag })}
              onSortChange={(sort: GroupSort) => patchQuery({ sort })}
              onLayoutChange={(layout: GroupLayout) => patchQuery({ layout })}
              onOpenMobileFilters={() => setFiltersOpen(true)}
            />
            <GroupBulkActions
              count={selectedVisible.length}
              canManage={canManage}
              sticky={isMobile}
              onOpen={() => selectedSpace && openSpace(selectedSpace)}
              onAssign={() => setAssignId(selectedVisible[0] ?? '')}
              onEdit={() => setEditId(selectedVisible[0] ?? '')}
              onExport={() => exportGroups(list.items, selectedVisible, copy.exported, setToast)}
              onDelete={() => setDeleteIds(selectedVisible)}
            />
            <div className={styles.workspace} data-testid="spaces-workspace">
              <div className={styles.workspaceMain}>
                <GroupsSummary
                  items={list.items}
                  unassignedCount={list.ungroupedCount}
                  canManage={canManage}
                  onDistribute={() => setDistributeOpen(true)}
                />
                {useCards ? (
                  <GroupsGrid
                    items={list.visible}
                    selectedIds={selectedIds}
                    canManage={canManage}
                    onToggle={toggle}
                    onEdit={setEditId}
                    onAssign={setAssignId}
                    onDelete={(id) => setDeleteIds([id])}
                    onRunOperation={() => navigate('/server-operations')}
                  />
                ) : (
                  <GroupsList
                    items={list.visible}
                    selectedIds={selectedIds}
                    canManage={canManage}
                    onToggle={toggle}
                    onEdit={setEditId}
                    onAssign={setAssignId}
                  />
                )}
              </div>
              <div className={styles.workspaceSide}>
                <UngroupedServersNotice
                  count={list.ungroupedCount}
                  canManage={canManage}
                  revision={list.lastSuccessfulAt}
                  selectedIds={ungroupedSelected}
                  onToggle={toggleUngrouped}
                  onDistribute={() => setDistributeOpen(true)}
                  onMove={() => setDistributeOpen(true)}
                />
                <SpacesAssignmentRules />
                <SpacesRecentActivity revision={list.lastSuccessfulAt} />
              </div>
            </div>
          </>
        ) : null}

        <MobileGroupsFilterSheet
          open={filtersOpen}
          filter={query.filter}
          tag={query.tag}
          tags={tags}
          sort={query.sort}
          onFilterChange={(filter) => patchQuery({ filter })}
          onTagChange={(tag) => patchQuery({ tag })}
          onSortChange={(sort) => patchQuery({ sort })}
          onApply={() => setFiltersOpen(false)}
          onReset={() => {
            patchQuery({ filter: 'all', tag: '', sort: 'name' });
            setFiltersOpen(false);
          }}
          onClose={() => setFiltersOpen(false)}
        />
        <CreateGroupDialog
          open={createOpen}
          existingNames={list.items.map((group) => group.name)}
          existingSlugs={list.items
            .map((group) => group.slug)
            .filter((item): item is string => Boolean(item))}
          existingTags={tags}
          serverIds={createServerIds}
          onClose={() => setCreateOpen(false)}
          onCreated={(space) => {
            setCreateOpen(false);
            setCreateServerIds([]);
            setToast(copy.created);
            void list.refresh();
            openSpace(space);
          }}
        />
        <EditGroupDialog
          open={Boolean(editId)}
          group={editGroup ?? null}
          existingNames={list.items.map((group) => group.name)}
          onClose={() => setEditId('')}
          onUpdated={() => {
            setEditId('');
            setToast(copy.updatedToast);
            void list.refresh();
          }}
        />
        <AssignServersDialog
          open={Boolean(assignId)}
          groupId={assignId || null}
          onClose={() => setAssignId('')}
          onAssigned={() => {
            setAssignId('');
            setToast(copy.assigned);
            void list.refresh();
          }}
        />
        <AssignServersDialog
          open={distributeOpen}
          groupId={null}
          groups={list.items.map((group) => ({ id: group.id, name: group.name }))}
          ungroupedOnly
          onClose={() => setDistributeOpen(false)}
          onAssigned={() => {
            setDistributeOpen(false);
            setToast(copy.assigned);
            void list.refresh();
          }}
        />
        <DeleteGroupDialog
          open={deleteIds.length > 0}
          groups={list.items}
          targetIds={deleteIds}
          onClose={() => setDeleteIds([])}
          onDeleted={() => {
            setDeleteIds([]);
            setSelectedIds([]);
            setToast(copy.deleted);
            void list.refresh();
          }}
        />
        {canCreateServer ? (
          <>
            <EnrollmentWizard
              variant="dialog"
              open={wizardOpen}
              onClose={() => {
                setWizardOpen(false);
                void list.refresh();
              }}
              onIssued={() => void list.refresh()}
              onConnected={() => void list.refresh()}
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
        <Toast message={toast} />
      </div>
    </ServerSectionLayout>
  );
}

function exportGroups(
  items: ServerGroup[],
  ids: string[],
  success: string,
  setToast: (value: string) => void,
) {
  const payload = items.filter((group) => ids.includes(group.id));
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'server-spaces.json';
  link.click();
  URL.revokeObjectURL(url);
  setToast(success);
}

export { ServerSpacesPage as ServerGroupsPage };
export type { ServerGroup };
