import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useParams, useSearchParams } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resources } from '@linuxpilot/i18n';
import { SERVER_ERROR_CODES, type ServerGroup } from '@linuxpilot/server-contracts';
import { AuthProvider } from '../../auth/AuthProvider';
import { ProtectedRoute } from '../../auth/ProtectedRoute';
import { GROUPS_LAYOUT_STORAGE_KEY } from '../../features/groups/types';
import { LocaleProvider, LOCALE_STORAGE_KEY } from '../../i18n';
import { testUser } from '../../test/auth-fixtures';
import { ServerGroupsPage } from './server-groups-page';

const en = resources.en;

const {
  fetchCurrentUserMock,
  listServerGroupsMock,
  getServerGroupMock,
  listServersMock,
  createServerGroupMock,
  updateServerGroupMock,
  deleteServerGroupMock,
  bulkAssignGroupMock,
  assignServerGroupMock,
  listServerAuditMock,
} = vi.hoisted(() => ({
  fetchCurrentUserMock: vi.fn(),
  listServerGroupsMock: vi.fn(),
  getServerGroupMock: vi.fn(),
  listServersMock: vi.fn(),
  createServerGroupMock: vi.fn(),
  updateServerGroupMock: vi.fn(),
  deleteServerGroupMock: vi.fn(),
  bulkAssignGroupMock: vi.fn(),
  assignServerGroupMock: vi.fn(),
  listServerAuditMock: vi.fn(),
}));

vi.mock('../../api/auth', () => ({
  login: vi.fn(),
  fetchCurrentUser: fetchCurrentUserMock,
  logout: vi.fn(),
}));

vi.mock('../../api/servers', () => ({
  listServerGroups: listServerGroupsMock,
  getServerGroup: getServerGroupMock,
  listServers: listServersMock,
  createServerGroup: createServerGroupMock,
  updateServerGroup: updateServerGroupMock,
  deleteServerGroup: deleteServerGroupMock,
  bulkAssignGroup: bulkAssignGroupMock,
  assignServerGroup: assignServerGroupMock,
  listServerAudit: listServerAuditMock,
}));

function group(partial: Partial<ServerGroup> = {}): ServerGroup {
  return {
    id: 'g1',
    name: 'Production',
    slug: 'production',
    description: 'Main production environment',
    color: '#3b82f6',
    tags: ['critical', 'prod'],
    notificationsEnabled: true,
    version: 1,
    createdAt: '2026-08-16T08:00:00.000Z',
    updatedAt: '2026-08-16T09:00:00.000Z',
    serverCount: 5,
    onlineCount: 4,
    offlineCount: 0,
    warningCount: 1,
    withoutAgentCount: 0,
    averageCpuPercent: 42,
    averageMemoryPercent: 58,
    averageDiskPercent: null,
    memberNames: ['web-01', 'database-01'],
    ...partial,
  };
}

function mockMatchMedia(mobile = false, tablet = false) {
  window.matchMedia = (query: string) =>
    ({
      matches:
        query === '(max-width: 767px)'
          ? mobile
          : query === '(min-width: 1280px)'
            ? !mobile && !tablet
            : query === '(max-width: 1279px)'
              ? mobile || tablet
              : false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }) as MediaQueryList;
}

function SearchProbe() {
  const [params] = useSearchParams();
  return <div data-testid="search-string">{params.toString()}</div>;
}

function SpaceProbe() {
  const { spaceSlug, tab } = useParams();
  return <div data-testid="space-detail-probe">{`${spaceSlug}/${tab ?? ''}`}</div>;
}

function renderGroups(path = '/server-groups', permissions = ['servers.view', 'servers.update']) {
  fetchCurrentUserMock.mockResolvedValue({ user: { ...testUser, permissions } });
  return render(
    <LocaleProvider>
      <AuthProvider>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route element={<ProtectedRoute />}>
              <Route path="/server-spaces/:spaceSlug/:tab" element={<SpaceProbe />} />
              <Route path="/server-spaces/:spaceSlug" element={<SpaceProbe />} />
              <Route
                path="/server-spaces"
                element={
                  <>
                    <SearchProbe />
                    <ServerGroupsPage />
                  </>
                }
              />
              <Route
                path="/server-groups"
                element={
                  <>
                    <SearchProbe />
                    <ServerGroupsPage />
                  </>
                }
              />
              <Route path="/servers" element={<div>Servers list</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </LocaleProvider>,
  );
}

describe('ServerGroupsPage', () => {
  beforeEach(() => {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, 'en');
    window.localStorage.removeItem(GROUPS_LAYOUT_STORAGE_KEY);
    mockMatchMedia(false);
    listServerGroupsMock.mockResolvedValue({
      items: [group(), group({ id: 'g2', name: 'Staging', slug: 'staging', tags: ['stage'], warningCount: 0 })],
      ungroupedCount: 2,
    });
    getServerGroupMock.mockResolvedValue(group());
    listServersMock.mockResolvedValue({
      items: [
        {
          id: 's1',
          name: 'web-01',
          hostname: 'web-01',
          primaryIp: '10.0.1.11',
          status: 'ONLINE',
          cpuUsagePercent: 12,
          groupId: 'g1',
          groupName: 'Production',
        },
      ],
      page: 1,
      pageSize: 5,
      total: 1,
    });
    createServerGroupMock.mockResolvedValue(group({ id: 'g3', name: 'Backup', slug: 'backup' }));
    updateServerGroupMock.mockResolvedValue(group({ name: 'Prod' }));
    deleteServerGroupMock.mockResolvedValue({ success: true });
    bulkAssignGroupMock.mockResolvedValue({ results: [] });
    assignServerGroupMock.mockResolvedValue({});
    listServerAuditMock.mockResolvedValue({ items: [], page: 1, pageSize: 8, total: 0 });
  });

  it('loads groups into the grid', async () => {
    renderGroups();
    expect(await screen.findByTestId('groups-grid')).toBeInTheDocument();
    expect(screen.getByTestId('group-card-g1')).toHaveTextContent('Production');
    expect(screen.getByTestId('ungrouped-notice')).toHaveTextContent('2');
    expect(
      screen.getByRole('heading', { level: 1, name: en.servers.groups.title }),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('section-groups')).not.toBeInTheDocument();
    expect(screen.queryByTestId('groups-environment')).not.toBeInTheDocument();
    expect(screen.queryByTestId('groups-count')).not.toBeInTheDocument();
  });

  it('searches and writes the query to the URL', async () => {
    renderGroups();
    await screen.findByTestId('groups-grid');
    fireEvent.change(screen.getByTestId('groups-search'), { target: { value: 'Staging' } });
    await waitFor(() => expect(screen.queryByTestId('group-card-g1')).not.toBeInTheDocument());
    expect(screen.getByTestId('group-card-g2')).toBeInTheDocument();
  });

  it('filters and sorts from the toolbar', async () => {
    renderGroups();
    await screen.findByTestId('groups-grid');
    fireEvent.change(screen.getByTestId('groups-filter'), { target: { value: 'warning' } });
    await waitFor(() => expect(screen.queryByTestId('group-card-g2')).not.toBeInTheDocument());
    expect(screen.getByTestId('group-card-g1')).toBeInTheDocument();
  });

  it('switches to list view', async () => {
    renderGroups();
    await screen.findByTestId('groups-grid');
    fireEvent.click(screen.getByTestId('groups-layout-list'));
    expect(await screen.findByTestId('groups-list')).toBeInTheDocument();
    expect(screen.getByTestId('group-row-g1')).toBeInTheDocument();
    expect(screen.queryByText(en.servers.groups.addServers)).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('group-list-menu-g1'));
    expect(screen.getByTestId('group-list-edit-g1')).toBeInTheDocument();
  });

  it('ignores leftover spaceId query parameters', async () => {
    renderGroups('/server-spaces?spaceId=g1');
    expect(await screen.findByTestId('server-groups-page')).toBeInTheDocument();
    expect(screen.queryByTestId('groups-inspector')).not.toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByTestId('search-string').textContent).not.toContain('spaceId'),
    );
  });

  it('opens the space page from the card Open link', async () => {
    renderGroups('/server-spaces');
    await screen.findByTestId('group-card-g1');
    fireEvent.click(screen.getByTestId('group-open-g1'));
    expect(await screen.findByTestId('space-detail-probe')).toHaveTextContent('production/');
    expect(screen.queryByTestId('groups-inspector')).not.toBeInTheDocument();
  });

  it('opens the space page from the main card area', async () => {
    renderGroups();
    await screen.findByTestId('group-card-g1');
    fireEvent.click(screen.getAllByLabelText('Open space Production')[0]!);
    expect(await screen.findByTestId('space-detail-probe')).toHaveTextContent('production/');
  });

  it('does not navigate when selecting a space checkbox', async () => {
    renderGroups('/server-spaces');
    await screen.findByTestId('group-card-g1');
    fireEvent.click(screen.getByLabelText('Select Production'));
    expect(screen.getByTestId('server-groups-page')).toBeInTheDocument();
    expect(screen.queryByTestId('space-detail-probe')).not.toBeInTheDocument();
    expect(screen.getByTestId('groups-bulk-bar')).toBeInTheDocument();
  });

  it('does not navigate when opening the card menu', async () => {
    renderGroups('/server-spaces');
    await screen.findByTestId('group-card-g1');
    fireEvent.click(screen.getByTestId('group-menu-g1'));
    expect(screen.getByTestId('group-edit-g1')).toBeInTheDocument();
    expect(screen.queryByTestId('space-detail-probe')).not.toBeInTheDocument();
  });

  it('creates a group after validation', async () => {
    renderGroups();
    await screen.findByTestId('create-group');
    fireEvent.click(screen.getByTestId('create-group'));
    expect(screen.getByTestId('create-group-submit')).toBeDisabled();
    expect(screen.queryByTestId('group-environment')).not.toBeInTheDocument();
    fireEvent.change(screen.getByTestId('group-name'), { target: { value: 'Backup' } });
    expect(screen.getByTestId('group-slug')).toHaveValue('backup');
    fireEvent.click(screen.getByTestId('create-group-submit'));
    await waitFor(() =>
      expect(createServerGroupMock).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Backup',
          slug: 'backup',
          icon: 'server',
          color: '#22d3ee',
          tags: [],
        }),
      ),
    );
    const payload = createServerGroupMock.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(payload).not.toHaveProperty('environment');
    expect(payload).not.toHaveProperty('environmentId');
    expect(payload).not.toHaveProperty('ownerId');
    expect(payload).not.toHaveProperty('teamId');
    expect(payload).not.toHaveProperty('permissions');
    expect(await screen.findByTestId('space-detail-probe')).toHaveTextContent('backup/');
  });

  it('edits a group and skips unchanged payloads', async () => {
    renderGroups();
    await screen.findByTestId('group-card-g1');
    fireEvent.click(screen.getByTestId('group-menu-g1'));
    fireEvent.click(screen.getByTestId('group-edit-g1'));
    fireEvent.click(await screen.findByTestId('edit-group-submit'));
    expect(await screen.findByText(en.servers.groups.noChanges)).toBeInTheDocument();
    fireEvent.change(screen.getByTestId('group-name'), { target: { value: 'Prod' } });
    fireEvent.click(screen.getByTestId('edit-group-submit'));
    await waitFor(() =>
      expect(updateServerGroupMock).toHaveBeenCalledWith(
        'g1',
        expect.objectContaining({ name: 'Prod', version: 1 }),
      ),
    );
  });

  it('shows a conflict message when the group version changed', async () => {
    const { ApiRequestError } = await import('../../api/client');
    updateServerGroupMock.mockRejectedValueOnce(
      new ApiRequestError(409, SERVER_ERROR_CODES.VERSION_CONFLICT, 'conflict'),
    );
    renderGroups();
    await screen.findByTestId('group-card-g1');
    fireEvent.click(screen.getByTestId('group-menu-g1'));
    fireEvent.click(screen.getByTestId('group-edit-g1'));
    fireEvent.change(await screen.findByTestId('group-name'), { target: { value: 'Prod' } });
    fireEvent.click(screen.getByTestId('edit-group-submit'));
    expect(await screen.findByText(en.servers.groups.conflict)).toBeInTheDocument();
  });

  it('assigns servers and warns about moves', async () => {
    listServersMock.mockResolvedValue({
      items: [
        {
          id: 's2',
          name: 'edge-01',
          hostname: 'edge-01',
          primaryIp: '10.0.1.20',
          status: 'ONLINE',
          cpuUsagePercent: 8,
          groupId: 'g2',
          groupName: 'Staging',
        },
      ],
      page: 1,
      pageSize: 100,
      total: 1,
    });
    renderGroups();
    await screen.findByTestId('group-card-g1');
    fireEvent.click(screen.getByTestId('group-menu-g1'));
    fireEvent.click(screen.getByTestId('group-assign-g1'));
    expect(await screen.findByTestId('assign-servers-dialog')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('checkbox', { name: /edge-01/i }));
    fireEvent.click(screen.getByTestId('assign-submit'));
    expect(await screen.findByText(en.servers.groups.assignMoveConfirm)).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('assign-submit'));
    await waitFor(() => expect(bulkAssignGroupMock).toHaveBeenCalled());
  });

  it('deletes a group without deleting servers', async () => {
    renderGroups();
    await screen.findByTestId('group-card-g1');
    fireEvent.click(screen.getByLabelText('Select Production'));
    fireEvent.click(screen.getByTestId('groups-bulk-more'));
    fireEvent.click(screen.getByText(en.servers.groups.bulk.delete));
    expect(await screen.findByTestId('delete-group-dialog')).toHaveTextContent('Production');
    fireEvent.click(screen.getByTestId('delete-group-confirm'));
    await waitFor(() =>
      expect(deleteServerGroupMock).toHaveBeenCalledWith('g1', { moveToSpaceId: null }),
    );
  });

  it('hides mutation actions without servers.update', async () => {
    renderGroups('/server-groups', ['servers.view']);
    await screen.findByTestId('groups-grid');
    expect(screen.queryByTestId('create-group')).not.toBeInTheDocument();
  });

  it('shows onboarding when there are no servers', async () => {
    listServerGroupsMock.mockResolvedValue({ items: [], ungroupedCount: 0 });
    renderGroups();
    expect(await screen.findByTestId('spaces-no-servers')).toBeInTheDocument();
    expect(screen.getByText(en.servers.groups.emptyNoServersTitle)).toBeInTheDocument();
    expect(screen.queryByTestId('spaces-no-spaces')).not.toBeInTheDocument();
    expect(screen.queryByTestId('spaces-unassigned')).not.toBeInTheDocument();
    expect(screen.queryByTestId('groups-search')).not.toBeInTheDocument();
    expect(screen.queryByTestId('groups-empty')).not.toBeInTheDocument();
  });

  it('shows the first-space state when servers exist without spaces', async () => {
    listServerGroupsMock.mockResolvedValue({ items: [], ungroupedCount: 2 });
    listServersMock.mockResolvedValue({
      items: [
        {
          id: 's1',
          name: 'web-prod-01',
          hostname: 'web-prod-01',
          primaryIp: '10.0.1.15',
          status: 'ONLINE',
          tags: ['web', 'prod'],
        },
        {
          id: 's2',
          name: 'backup-01',
          hostname: 'backup-01',
          primaryIp: '10.0.1.40',
          status: 'DEGRADED',
          tags: ['backup'],
          groupId: 'gone',
          spaceId: 'gone',
        },
        {
          id: 's3',
          name: 'db-prod-01',
          hostname: 'db-prod-01',
          primaryIp: '10.0.1.20',
          status: 'ONLINE',
          tags: ['db', 'prod'],
        },
      ],
      page: 1,
      pageSize: 50,
      total: 3,
    });
    renderGroups();
    expect(await screen.findByTestId('spaces-no-spaces')).toBeInTheDocument();
    expect(await screen.findByTestId('spaces-server-s1')).toBeInTheDocument();
    expect(screen.getByTestId('spaces-server-s3')).toBeInTheDocument();
    expect(screen.queryByTestId('spaces-server-s2')).not.toBeInTheDocument();
    expect(screen.getByTestId('spaces-how-it-works')).toBeInTheDocument();
    expect(screen.getByTestId('spaces-create-from-selected')).toBeDisabled();
    expect(screen.queryByTestId('spaces-no-servers')).not.toBeInTheDocument();
    expect(screen.queryByText(en.servers.groups.emptyNoServersTitle)).not.toBeInTheDocument();
    expect(screen.queryByTestId('groups-search')).not.toBeInTheDocument();
    expect(screen.queryByTestId('section-groups')).not.toBeInTheDocument();
    expect(screen.queryByTestId('groups-environment')).not.toBeInTheDocument();
    expect(screen.queryByTestId('groups-count')).not.toBeInTheDocument();
  });

  it('creates a space with selected unassigned servers', async () => {
    listServerGroupsMock.mockResolvedValue({ items: [], ungroupedCount: 2 });
    listServersMock.mockResolvedValue({
      items: [
        {
          id: 's1',
          name: 'web-01',
          hostname: 'web-01',
          primaryIp: '10.0.1.11',
          status: 'ONLINE',
          tags: ['web'],
        },
        {
          id: 's4',
          name: 'api-01',
          hostname: 'api-01',
          primaryIp: '10.0.1.18',
          status: 'ONLINE',
          tags: ['api'],
        },
      ],
      page: 1,
      pageSize: 50,
      total: 2,
    });
    createServerGroupMock.mockImplementation(async (body: { name: string }) => {
      listServerGroupsMock.mockResolvedValue({
        items: [group({ id: 'g3', name: body.name, slug: 'web' })],
        ungroupedCount: 0,
      });
      return { id: 'g3', name: body.name, slug: 'web' };
    });
    renderGroups();
    expect(await screen.findByTestId('spaces-create-from-selected')).toBeDisabled();
    await screen.findByTestId('spaces-server-s1');
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select web-01' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select api-01' }));
    fireEvent.click(screen.getByTestId('spaces-create-from-selected'));
    expect(screen.getByTestId('create-group-dialog')).toBeInTheDocument();
    expect(screen.getByTestId('space-preselected-servers')).toHaveTextContent('2');
    fireEvent.change(screen.getByTestId('group-name'), { target: { value: 'Web' } });
    fireEvent.click(screen.getByTestId('create-group-submit'));
    await waitFor(() =>
      expect(createServerGroupMock).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Web',
          slug: 'web',
          serverIds: ['s1', 's4'],
        }),
      ),
    );
    expect(await screen.findByTestId('space-detail-probe')).toHaveTextContent('web/');
    expect(screen.queryByTestId('spaces-no-spaces')).not.toBeInTheDocument();
  });

  it('hides first-space create actions without servers.update', async () => {
    listServerGroupsMock.mockResolvedValue({ items: [], ungroupedCount: 1 });
    listServersMock.mockResolvedValue({
      items: [
        {
          id: 's1',
          name: 'web-01',
          hostname: 'web-01',
          primaryIp: '10.0.1.11',
          status: 'ONLINE',
          tags: ['web'],
        },
      ],
      page: 1,
      pageSize: 50,
      total: 1,
    });
    renderGroups('/server-groups', ['servers.view']);
    expect(await screen.findByTestId('spaces-no-spaces')).toBeInTheDocument();
    expect(screen.queryByTestId('create-group')).not.toBeInTheDocument();
    expect(screen.queryByTestId('spaces-create-first')).not.toBeInTheDocument();
    expect(screen.getByTestId('spaces-create-hint')).toBeInTheDocument();
    expect(screen.getByTestId('spaces-unassigned')).toBeInTheDocument();
  });

  it('shows a skeleton while spaces are loading', async () => {
    listServerGroupsMock.mockImplementation(() => new Promise(() => undefined));
    renderGroups();
    expect(await screen.findByTestId('groups-loading')).toBeInTheDocument();
    expect(screen.queryByTestId('spaces-no-spaces')).not.toBeInTheDocument();
    expect(screen.queryByTestId('spaces-no-servers')).not.toBeInTheDocument();
  });

  it('shows an error instead of an empty state', async () => {
    listServerGroupsMock.mockRejectedValue(new Error('down'));
    renderGroups();
    expect(await screen.findByTestId('groups-error')).toBeInTheDocument();
    expect(screen.getByText(en.servers.groups.errorTitle)).toBeInTheDocument();
    expect(screen.queryByTestId('spaces-no-spaces')).not.toBeInTheDocument();
    expect(screen.queryByTestId('spaces-no-servers')).not.toBeInTheDocument();
  });

  it('resets filters when the workspace search is empty', async () => {
    renderGroups('/server-groups?q=missing');
    expect(await screen.findByTestId('groups-filtered-empty')).toBeInTheDocument();
    expect(screen.queryByTestId('spaces-no-spaces')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: en.servers.groups.resetFilters }));
    expect(await screen.findByTestId('groups-grid')).toBeInTheDocument();
  });

  it('opens mobile cards and the filter sheet', async () => {
    mockMatchMedia(true);
    renderGroups();
    expect(await screen.findByTestId('groups-grid')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('groups-open-filters'));
    expect(screen.getByTestId('groups-filter-sheet')).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() =>
      expect(screen.queryByTestId('groups-filter-sheet')).not.toBeInTheDocument(),
    );
  });

  it('localizes the page into Ukrainian', async () => {
    renderGroups();
    await screen.findByTestId('groups-grid');
    fireEvent.click(screen.getByRole('button', { name: en.common.language.switcher }));
    fireEvent.click(screen.getByRole('option', { name: 'UA' }));
    expect(
      await screen.findByRole('heading', { level: 1, name: resources.uk.servers.groups.title }),
    ).toBeInTheDocument();
  });
});
