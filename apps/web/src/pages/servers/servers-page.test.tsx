import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resources } from '@linuxpilot/i18n';
import { SERVER_STATUSES, type ServerStatus } from '@linuxpilot/server-contracts';
import { AuthProvider } from '../../auth/AuthProvider';
import { ProtectedRoute } from '../../auth/ProtectedRoute';
import { LocaleProvider, LOCALE_STORAGE_KEY } from '../../i18n';
import { testUser } from '../../test/auth-fixtures';
import { ServersPage } from './servers-page';

const en = resources.en;

const {
  fetchCurrentUserMock,
  listServersMock,
  getServerMock,
  getServerAuditMock,
  deleteServerMock,
  revokeServerMock,
} = vi.hoisted(() => ({
  fetchCurrentUserMock: vi.fn(),
  listServersMock: vi.fn(),
  getServerMock: vi.fn(),
  getServerAuditMock: vi.fn(),
  deleteServerMock: vi.fn(),
  revokeServerMock: vi.fn(),
}));

vi.mock('../../api/auth', () => ({
  login: vi.fn(),
  fetchCurrentUser: fetchCurrentUserMock,
  logout: vi.fn(),
}));

vi.mock('../../api/servers', () => ({
  listServers: listServersMock,
  listServerGroups: vi.fn().mockResolvedValue({ items: [], ungroupedCount: 0 }),
  getServer: getServerMock,
  getServerAudit: getServerAuditMock,
  deleteServer: deleteServerMock,
  revokeServer: revokeServerMock,
  createServer: vi.fn(),
  updateServer: vi.fn(),
  createEnrollmentToken: vi.fn(),
  createServerGroup: vi.fn(),
  bulkAssignGroup: vi.fn().mockResolvedValue({ results: [] }),
  bulkCreateOperations: vi.fn().mockResolvedValue({ results: [] }),
  bulkStartMaintenance: vi.fn().mockResolvedValue({ results: [] }),
}));

const operator = {
  ...testUser,
  permissions: ['servers.view', 'servers.create', 'servers.delete'],
};

function item(id: string, name: string, status: ServerStatus = SERVER_STATUSES.ONLINE) {
  return {
    id,
    name,
    hostname: name,
    description: '',
    status,
    osName: 'Ubuntu',
    osVersion: '24.04',
    kernelVersion: null,
    architecture: null,
    agentVersion: status === SERVER_STATUSES.PENDING ? null : '1.8.2',
    lastSeenAt: status === SERVER_STATUSES.PENDING ? null : '2026-08-16T09:00:00.000Z',
    createdAt: '2026-08-16T08:00:00.000Z',
    updatedAt: '2026-08-16T09:00:00.000Z',
    tags: id === '1' ? ['web', 'production'] : ['web'],
    primaryIp: '10.0.1.11',
    agentStatus: status === SERVER_STATUSES.PENDING ? 'NOT_INSTALLED' : 'CONNECTED',
    groupId: id === '1' ? 'space-prod' : null,
    groupName: id === '1' ? 'Production' : null,
    spaceId: id === '1' ? 'space-prod' : null,
    spaceName: id === '1' ? 'Production' : null,
    maintenanceMode: false,
    version: 1,
    cpuCores: 4,
    credentialId: null,
    cpuUsagePercent: status === SERVER_STATUSES.PENDING ? null : 38,
    memoryUsedBytes: status === SERVER_STATUSES.PENDING ? null : 52,
    memoryTotalBytes: status === SERVER_STATUSES.PENDING ? null : 100,
    diskUsedBytes: status === SERVER_STATUSES.PENDING ? null : 40,
    diskTotalBytes: status === SERVER_STATUSES.PENDING ? null : 100,
    uptimeSeconds: 100,
  };
}

function mockLists() {
  listServersMock.mockImplementation(async (params: URLSearchParams) => {
    const status = params.get('status');
    const q = params.get('q') ?? '';
    const all = [item('1', 'prod-web-01'), item('2', 'pending-01', SERVER_STATUSES.PENDING)].filter(
      (server) => !q || server.name.includes(q),
    );
    const items = status ? all.filter((server) => server.status === status) : all;
    return { items, page: 1, pageSize: 25, total: items.length };
  });
}

function mockMatchMedia(mobile = false) {
  window.matchMedia = (query: string) =>
    ({
      matches:
        query === '(max-width: 767px)'
          ? mobile
          : query === '(min-width: 1280px)'
            ? !mobile
            : query === '(max-width: 1279px)'
              ? mobile
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

function renderServers(path = '/servers') {
  return render(
    <LocaleProvider>
      <MemoryRouter initialEntries={[path]}>
        <AuthProvider>
          <Routes>
            <Route element={<ProtectedRoute />}>
              <Route path="/servers" element={<ServersPage />} />
              <Route path="/servers/new" element={<div>Add server page</div>} />
              <Route path="/servers/:id" element={<div>Server details</div>} />
            </Route>
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    </LocaleProvider>,
  );
}

describe('ServersPage', () => {
  beforeEach(() => {
    fetchCurrentUserMock.mockReset();
    listServersMock.mockReset();
    getServerMock.mockReset();
    getServerAuditMock.mockReset();
    deleteServerMock.mockReset();
    revokeServerMock.mockReset();
    fetchCurrentUserMock.mockResolvedValue({ user: operator });
    mockLists();
    getServerMock.mockResolvedValue(item('1', 'prod-web-01'));
    getServerAuditMock.mockResolvedValue({
      items: [
        {
          id: 'e1',
          action: 'server.updated',
          actorId: null,
          requestId: null,
          createdAt: '2026-08-16T09:10:00.000Z',
          metadata: {},
        },
      ],
    });
    window.localStorage.setItem(LOCALE_STORAGE_KEY, 'en');
    mockMatchMedia(false);
  });

  it('loads the server table from the list API', async () => {
    renderServers();
    expect(await screen.findByTestId('servers-table')).toBeInTheDocument();
    expect(screen.getByTestId('servers-summary')).toBeInTheDocument();
    expect(screen.getByTestId('server-row-1')).toHaveTextContent('prod-web-01');
    expect(screen.getByTestId('server-row-1')).toHaveTextContent('10.0.1.11');
    expect(screen.getByTestId('add-server')).toBeEnabled();
    expect(
      screen.getByRole('heading', { level: 1, name: en.servers.list.title }),
    ).toBeInTheDocument();
    expect(within(screen.getByTestId('servers-page')).getByText(en.servers.nav)).toBeInTheDocument();
    expect(screen.getByTestId('server-row-1')).toHaveTextContent(
      en.servers.list.environment.production,
    );
  });

  it('searches and writes the query to the URL', async () => {
    renderServers();
    await screen.findByTestId('servers-table');
    fireEvent.change(screen.getByTestId('servers-search'), { target: { value: 'prod' } });
    await waitFor(() =>
      expect(listServersMock.mock.calls.some((call) => call[0].get('q') === 'prod')).toBe(true),
    );
  });

  it('keeps the fleet layout without old quick filters or auto-refresh', async () => {
    renderServers();
    await screen.findByTestId('servers-table');
    expect(screen.queryByTestId('servers-view-online')).not.toBeInTheDocument();
    expect(screen.queryByTestId('servers-autorefresh')).not.toBeInTheDocument();
    expect(screen.queryByTestId('servers-sort')).not.toBeInTheDocument();
    expect(screen.queryByText(`${en.navigation.items.home} /`)).not.toBeInTheDocument();
    expect(screen.getByTestId('servers-summary')).toBeInTheDocument();
    expect(screen.queryByTestId('section-servers')).not.toBeInTheDocument();
    expect(screen.getByTestId('servers-pagination')).toHaveTextContent('Showing 1–2 of 2 servers');
  });

  it('shows the server name and IP instead of a generated hostname', async () => {
    listServersMock.mockResolvedValue({
      items: [{ ...item('1', 'Production Web'), hostname: 'yibl-udcf', primaryIp: '10.0.1.24' }],
      page: 1,
      pageSize: 25,
      total: 1,
    });
    renderServers();
    const row = await screen.findByTestId('server-row-1');
    expect(row).toHaveTextContent('Production Web');
    expect(row).toHaveTextContent('10.0.1.24');
    expect(row).not.toHaveTextContent('yibl-udcf');
  });

  it('opens server details from the name cell', async () => {
    renderServers();
    await screen.findByTestId('server-row-1');
    fireEvent.click(screen.getByTestId('server-open-1'));
    expect(await screen.findByText('Server details')).toBeInTheDocument();
  });

  it('opens the inspector from the row menu', async () => {
    renderServers();
    await screen.findByTestId('server-row-1');
    fireEvent.click(
      within(screen.getByTestId('server-row-1')).getByLabelText(en.servers.list.moreActions),
    );
    fireEvent.click(screen.getByRole('menuitem', { name: en.servers.list.inspector.title }));
    expect(await screen.findByTestId('servers-inspector')).toBeInTheDocument();
    expect(getServerMock).toHaveBeenCalledWith('1');
    expect(screen.getByText(en.servers.list.inspector.resources)).toBeInTheDocument();
  });

  it('keeps the table available when the inspector fails', async () => {
    getServerMock.mockRejectedValueOnce(new Error('down'));
    getServerAuditMock.mockRejectedValueOnce(new Error('down'));
    renderServers('/servers?server=1');
    expect(await screen.findByTestId('servers-table')).toBeInTheDocument();
    expect(await screen.findByTestId('servers-inspector')).toHaveTextContent(
      en.servers.list.errorTitle,
    );
  });

  it('shows a missing-agent notice and dash metrics', async () => {
    renderServers();
    expect(await screen.findByTestId('servers-agent-notice')).toBeInTheDocument();
    expect(screen.getByTestId('server-row-2')).toHaveTextContent(en.servers.list.agentMissing);
    expect(screen.getByTestId('server-row-2')).toHaveTextContent('—');
  });

  it('selects multiple servers for bulk actions', async () => {
    renderServers();
    await screen.findByTestId('server-row-1');
    fireEvent.click(screen.getByLabelText('Select prod-web-01'));
    fireEvent.click(screen.getByLabelText('Select pending-01'));
    expect(screen.getByTestId('servers-bulk-bar')).toHaveTextContent('2');
  });

  it('renders mobile cards and the filter sheet', async () => {
    mockMatchMedia(true);
    renderServers();
    expect(await screen.findByTestId('servers-cards')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('servers-open-filters'));
    expect(screen.getByTestId('servers-filter-sheet')).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() =>
      expect(screen.queryByTestId('servers-filter-sheet')).not.toBeInTheDocument(),
    );
  });

  it('shows a loading skeleton before the list arrives', async () => {
    listServersMock.mockReturnValue(new Promise(() => undefined));
    renderServers();
    expect(await screen.findByTestId('servers-loading')).toBeInTheDocument();
    expect(screen.queryByTestId('servers-empty')).not.toBeInTheDocument();
    expect(screen.queryByTestId('servers-table')).not.toBeInTheDocument();
  });

  it('shows an error state when the list fails', async () => {
    listServersMock.mockRejectedValue(new Error('down'));
    renderServers();
    expect(await screen.findByTestId('servers-error')).toBeInTheDocument();
    expect(screen.getByText(en.servers.list.errorTitle)).toBeInTheDocument();
    expect(screen.queryByTestId('servers-empty')).not.toBeInTheDocument();
    expect(screen.queryByText('down')).not.toBeInTheDocument();
  });

  it('shows onboarding when the fleet is empty', async () => {
    listServersMock.mockResolvedValue({ items: [], page: 1, pageSize: 25, total: 0 });
    renderServers();
    expect(await screen.findByTestId('servers-empty')).toBeInTheDocument();
    expect(screen.getByTestId('empty-add-server')).toBeEnabled();
    expect(screen.getByTestId('add-server')).toBeEnabled();
    expect(screen.queryByTestId('servers-summary')).not.toBeInTheDocument();
    expect(screen.queryByTestId('servers-table')).not.toBeInTheDocument();
    expect(screen.queryByTestId('servers-agent-notice')).not.toBeInTheDocument();
    expect(screen.queryByTestId('servers-search')).not.toBeInTheDocument();
  });

  it('explains that only an administrator can add the first server', async () => {
    fetchCurrentUserMock.mockResolvedValue({
      user: { ...operator, permissions: ['servers.view'] },
    });
    listServersMock.mockResolvedValue({ items: [], page: 1, pageSize: 25, total: 0 });
    renderServers();
    expect(await screen.findByTestId('servers-empty')).toBeInTheDocument();
    expect(screen.getByText(en.servers.list.emptyForbidden)).toBeInTheDocument();
    expect(screen.queryByTestId('add-server')).not.toBeInTheDocument();
    expect(screen.queryByTestId('empty-add-server')).not.toBeInTheDocument();
  });

  it('keeps filters when the search matches nothing', async () => {
    renderServers('/servers?q=missing-host');
    expect(await screen.findByTestId('servers-filtered-empty')).toBeInTheDocument();
    expect(screen.getByTestId('servers-summary')).toBeInTheDocument();
    expect(screen.queryByTestId('servers-empty')).not.toBeInTheDocument();
    fireEvent.click(
      within(screen.getByTestId('servers-filtered-empty')).getByText(en.servers.list.clearFilters),
    );
    expect(await screen.findByTestId('servers-table')).toBeInTheDocument();
  });

  it('localizes the page into Ukrainian', async () => {
    renderServers();
    await screen.findByTestId('servers-table');
    fireEvent.click(screen.getByRole('button', { name: en.common.language.switcher }));
    fireEvent.click(screen.getByRole('option', { name: 'UA' }));
    expect(
      await screen.findByRole('heading', { level: 1, name: resources.uk.servers.list.title }),
    ).toBeInTheDocument();
    expect(screen.getByText(resources.uk.servers.list.subtitle)).toBeInTheDocument();
  });
});
