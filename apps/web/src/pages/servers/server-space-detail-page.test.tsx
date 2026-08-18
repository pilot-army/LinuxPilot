import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resources } from '@linuxpilot/i18n';
import { SERVER_ERROR_CODES, type ServerGroup } from '@linuxpilot/server-contracts';
import { AuthProvider } from '../../auth/AuthProvider';
import { ProtectedRoute } from '../../auth/ProtectedRoute';
import { LocaleProvider, LOCALE_STORAGE_KEY } from '../../i18n';
import { testUser } from '../../test/auth-fixtures';
import { ApiRequestError } from '../../api/client';
import { ServerSpaceDetailPage } from './server-space-detail-page';
import { ServerSpacesPage } from './server-spaces-page';

const en = resources.en;

const {
  fetchCurrentUserMock,
  listServerGroupsMock,
  getServerGroupMock,
  listServersMock,
  updateServerGroupMock,
  deleteServerGroupMock,
  listServerAuditMock,
  assignServerGroupMock,
  bulkAssignGroupMock,
} = vi.hoisted(() => ({
  fetchCurrentUserMock: vi.fn(),
  listServerGroupsMock: vi.fn(),
  getServerGroupMock: vi.fn(),
  listServersMock: vi.fn(),
  updateServerGroupMock: vi.fn(),
  deleteServerGroupMock: vi.fn(),
  listServerAuditMock: vi.fn(),
  assignServerGroupMock: vi.fn(),
  bulkAssignGroupMock: vi.fn(),
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
  updateServerGroup: updateServerGroupMock,
  deleteServerGroup: deleteServerGroupMock,
  listServerAudit: listServerAuditMock,
  assignServerGroup: assignServerGroupMock,
  bulkAssignGroup: bulkAssignGroupMock,
  createServerGroup: vi.fn(),
}));

function group(partial: Partial<ServerGroup> = {}): ServerGroup {
  return {
    id: 'g1',
    name: 'Development',
    slug: 'development',
    description: 'Dev environment',
    color: '#22d3ee',
    tags: ['dev'],
    notificationsEnabled: true,
    version: 1,
    createdAt: '2026-08-16T08:00:00.000Z',
    updatedAt: '2026-08-16T09:00:00.000Z',
    serverCount: 1,
    onlineCount: 1,
    offlineCount: 0,
    warningCount: 0,
    withoutAgentCount: 0,
    averageCpuPercent: 12,
    averageMemoryPercent: 34,
    averageDiskPercent: 20,
    memberNames: ['web-01'],
    ...partial,
  };
}

function serverItem() {
  return {
    id: 's1',
    name: 'web-01',
    hostname: 'web-01',
    primaryIp: '10.0.1.11',
    status: 'ONLINE',
    osName: 'Ubuntu',
    osVersion: '24.04',
    agentVersion: '1.8.2',
    lastSeenAt: '2026-08-16T09:00:00.000Z',
    cpuUsagePercent: 12,
    memoryUsedBytes: 34,
    memoryTotalBytes: 100,
    diskUsedBytes: 20,
    diskTotalBytes: 100,
    spaceId: 'g1',
    groupId: 'g1',
  };
}

function renderDetail(path = '/server-spaces/development') {
  fetchCurrentUserMock.mockResolvedValue({
    user: { ...testUser, permissions: ['servers.view', 'servers.update', 'servers.create'] },
  });
  return render(
    <LocaleProvider>
      <AuthProvider>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route element={<ProtectedRoute />}>
              <Route path="/server-spaces" element={<ServerSpacesPage />} />
              <Route path="/server-spaces/:spaceSlug" element={<ServerSpaceDetailPage />} />
              <Route path="/server-spaces/:spaceSlug/:tab" element={<ServerSpaceDetailPage />} />
            </Route>
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </LocaleProvider>,
  );
}

describe('ServerSpaceDetailPage', () => {
  beforeEach(() => {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, 'en');
    getServerGroupMock.mockReset();
    listServerGroupsMock.mockReset();
    listServersMock.mockReset();
    listServerAuditMock.mockReset();
    updateServerGroupMock.mockReset();
    deleteServerGroupMock.mockReset();
    assignServerGroupMock.mockReset();
    bulkAssignGroupMock.mockReset();
    getServerGroupMock.mockResolvedValue(group());
    listServerGroupsMock.mockResolvedValue({ items: [group()], ungroupedCount: 0 });
    listServersMock.mockResolvedValue({
      items: [serverItem()],
      page: 1,
      pageSize: 100,
      total: 1,
    });
    listServerAuditMock.mockResolvedValue({ items: [], page: 1, pageSize: 50, total: 0 });
    updateServerGroupMock.mockImplementation(async (_id: string, body: Partial<ServerGroup>) =>
      group({ ...body, version: 2 }),
    );
    deleteServerGroupMock.mockResolvedValue({ success: true });
    assignServerGroupMock.mockResolvedValue({});
    bulkAssignGroupMock.mockResolvedValue({ results: [] });
  });

  it('loads a space by slug and shows servers', async () => {
    renderDetail();
    expect(await screen.findByTestId('space-detail-page')).toBeInTheDocument();
    expect(getServerGroupMock).toHaveBeenCalledWith('development');
    expect(screen.getByRole('heading', { level: 1, name: 'Development' })).toBeInTheDocument();
    expect(screen.getByText('Dev environment')).toBeInTheDocument();
    expect(await screen.findByTestId('space-server-s1')).toHaveTextContent('web-01');
    expect(screen.getByTestId('space-tab-servers')).toHaveAttribute(
      'href',
      '/server-spaces/development',
    );
  });

  it('shows a skeleton while the space is loading', async () => {
    getServerGroupMock.mockImplementation(() => new Promise(() => undefined));
    renderDetail();
    expect(await screen.findByTestId('space-detail-loading')).toBeInTheDocument();
  });

  it('shows not found for an unknown slug', async () => {
    getServerGroupMock.mockRejectedValueOnce(
      new ApiRequestError(404, SERVER_ERROR_CODES.SPACE_NOT_FOUND, 'missing'),
    );
    renderDetail('/server-spaces/missing');
    expect(await screen.findByTestId('space-detail-not-found')).toHaveTextContent(
      en.servers.groups.detail.notFound,
    );
  });

  it('shows not found for an unknown tab', async () => {
    renderDetail('/server-spaces/development/unknown');
    expect(await screen.findByTestId('space-detail-not-found')).toBeInTheDocument();
    expect(getServerGroupMock).not.toHaveBeenCalled();
  });

  it('updates settings without a full reload and checks slug uniqueness', async () => {
    listServerGroupsMock.mockResolvedValue({
      items: [group(), group({ id: 'g2', name: 'Staging', slug: 'staging' })],
      ungroupedCount: 0,
    });
    renderDetail('/server-spaces/development/settings');
    expect(await screen.findByTestId('space-settings')).toBeInTheDocument();
    await waitFor(() => expect(listServerGroupsMock).toHaveBeenCalled());
    fireEvent.change(screen.getByTestId('group-slug'), { target: { value: 'staging' } });
    fireEvent.click(screen.getByTestId('space-settings-save'));
    expect(await screen.findByText(en.servers.groups.createDialog.slugTaken)).toBeInTheDocument();
    fireEvent.change(screen.getByTestId('group-name'), { target: { value: 'Dev' } });
    fireEvent.change(screen.getByTestId('group-slug'), { target: { value: 'dev' } });
    updateServerGroupMock.mockResolvedValueOnce(group({ name: 'Dev', slug: 'dev', version: 2 }));
    fireEvent.click(screen.getByTestId('space-settings-save'));
    await waitFor(() =>
      expect(updateServerGroupMock).toHaveBeenCalledWith(
        'g1',
        expect.objectContaining({ name: 'Dev', slug: 'dev', version: 1 }),
      ),
    );
    expect(await screen.findByRole('heading', { level: 1, name: 'Dev' })).toBeInTheDocument();
    expect(screen.getByTestId('space-settings-saved')).toBeInTheDocument();
  });

  it('returns to the spaces list after delete', async () => {
    renderDetail('/server-spaces/development/settings');
    fireEvent.click(await screen.findByTestId('space-settings-delete'));
    fireEvent.click(await screen.findByTestId('delete-group-confirm'));
    await waitFor(() =>
      expect(deleteServerGroupMock).toHaveBeenCalledWith('g1', { moveToSpaceId: null }),
    );
    expect(await screen.findByTestId('server-groups-page')).toBeInTheDocument();
  });

  it('shows the empty servers state', async () => {
    getServerGroupMock.mockResolvedValue(group({ serverCount: 0, memberNames: [] }));
    listServersMock.mockResolvedValue({ items: [], page: 1, pageSize: 100, total: 0 });
    renderDetail();
    expect(await screen.findByTestId('space-servers-empty')).toHaveTextContent(
      en.servers.groups.emptyGroup,
    );
    expect(screen.getByTestId('space-empty-add-server')).toBeInTheDocument();
  });
});
