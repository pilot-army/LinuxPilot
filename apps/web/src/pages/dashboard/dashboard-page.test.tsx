import { render, screen, waitFor, within } from '@testing-library/react';
import { fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resources } from '@linuxpilot/i18n';
import { AuthProvider } from '../../auth/AuthProvider';
import { ProtectedRoute } from '../../auth/ProtectedRoute';
import { LocaleProvider, LOCALE_STORAGE_KEY } from '../../i18n';
import type { DashboardSnapshot } from '../../features/dashboard/types';
import { testUser } from '../../test/auth-fixtures';
import { DashboardPage } from './dashboard-page';

const en = resources.en;
const uk = resources.uk;

const { fetchCurrentUserMock, loadDashboardSnapshotMock, listServersMock } = vi.hoisted(() => ({
  fetchCurrentUserMock: vi.fn(),
  loadDashboardSnapshotMock: vi.fn(),
  listServersMock: vi.fn(),
}));

vi.mock('../../api/auth', () => ({
  login: vi.fn(),
  fetchCurrentUser: fetchCurrentUserMock,
  logout: vi.fn(),
}));

vi.mock('../../features/dashboard/dashboard-service', () => ({
  loadDashboardSnapshot: loadDashboardSnapshotMock,
}));

vi.mock('../../api/servers', async () => {
  const actual = await vi.importActual<typeof import('../../api/servers')>('../../api/servers');
  return {
    ...actual,
    listServers: listServersMock,
  };
});

const operator = {
  ...testUser,
  permissions: ['servers.view', 'servers.create', 'servers.delete', 'ssh_keys.read'],
};

function emptySummary(): DashboardSnapshot['summary'] {
  return {
    total: 0,
    online: 0,
    offline: 0,
    warning: 0,
    waitingAgent: 0,
    onlinePercent: 0,
    availabilityPercent: 0,
    averageCpu: null,
    currentCpu: null,
    averageRam: null,
    averageDisk: null,
    diskFree: null,
    disconnectedAgents: 0,
    attentionCount: 0,
    cpuCoresUsed: null,
    cpuCoresTotal: null,
    memoryUsedBytes: null,
    memoryTotalBytes: null,
    diskUsedBytes: null,
    diskTotalBytes: null,
    maintenanceCount: 0,
  };
}

function dashServer(
  partial: Partial<DashboardSnapshot['servers']['data'] extends (infer T)[] | null ? T : never> & {
    id: string;
    name: string;
  },
): NonNullable<DashboardSnapshot['servers']['data']>[number] {
  return {
    hostname: partial.hostname ?? partial.name,
    ipAddress: partial.ipAddress ?? null,
    status: partial.status ?? 'online',
    sourceStatus: partial.sourceStatus ?? 'ONLINE',
    cpuPercent: partial.cpuPercent ?? null,
    ramPercent: partial.ramPercent ?? null,
    diskPercent: partial.diskPercent ?? null,
    agentVersion: partial.agentVersion ?? null,
    lastSeenAt: partial.lastSeenAt ?? null,
    uptimeSeconds: partial.uptimeSeconds ?? null,
    hasAgent: partial.hasAgent ?? false,
    osName: partial.osName ?? null,
    groupName: partial.groupName ?? null,
    spaceName: partial.spaceName ?? partial.groupName ?? null,
    tags: partial.tags ?? [],
    agentStatus: partial.agentStatus ?? 'NOT_INSTALLED',
    maintenanceMode: partial.maintenanceMode ?? false,
    cpuCores: partial.cpuCores ?? null,
    memoryUsedBytes: partial.memoryUsedBytes ?? null,
    memoryTotalBytes: partial.memoryTotalBytes ?? null,
    diskUsedBytes: partial.diskUsedBytes ?? null,
    diskTotalBytes: partial.diskTotalBytes ?? null,
    ...partial,
  };
}

function snapshot(overrides: Partial<DashboardSnapshot> = {}): DashboardSnapshot {
  return {
    summary: {
      total: 5,
      online: 4,
      offline: 0,
      warning: 0,
      waitingAgent: 1,
      onlinePercent: 80,
      availabilityPercent: 80,
      averageCpu: 38,
      currentCpu: 38,
      averageRam: 52,
      averageDisk: 62,
      diskFree: 38,
      disconnectedAgents: 1,
      attentionCount: 1,
      cpuCoresUsed: 9.1,
      cpuCoresTotal: 24,
      memoryUsedBytes: 88,
      memoryTotalBytes: 144,
      diskUsedBytes: 54,
      diskTotalBytes: 100,
      maintenanceCount: 0,
    },
    servers: {
      status: 'success',
      error: null,
      data: [
        dashServer({
          id: '1',
          name: 'prod-01',
          ipAddress: '192.168.1.10',
          status: 'online',
          sourceStatus: 'ONLINE',
          cpuPercent: 38,
          ramPercent: 52,
          diskPercent: 62,
          agentVersion: '1.2.0',
          lastSeenAt: '2026-08-16T09:36:00.000Z',
          uptimeSeconds: 86400,
          hasAgent: true,
          osName: 'Ubuntu',
          groupName: 'Production',
          tags: ['production'],
          agentStatus: 'CONNECTED',
        }),
        dashServer({
          id: '2',
          name: 'pending-01',
          status: 'no-agent',
          sourceStatus: 'PENDING',
          hasAgent: false,
        }),
      ],
    },
    load: {
      status: 'success',
      error: null,
      data: {
        currentCpu: 38,
        currentRam: 52,
        lastMetricAt: '2026-08-16T09:36:00.000Z',
        points: [
          { timestamp: '2026-08-16T00:00:00.000Z', cpuPercent: 20, ramPercent: 40 },
          { timestamp: '2026-08-16T06:00:00.000Z', cpuPercent: 38, ramPercent: 52 },
        ],
      },
    },
    activity: {
      status: 'success',
      error: null,
      data: [
        {
          id: 'a1',
          type: 'success',
          action: 'server.enrollment.completed',
          serverName: 'web-02',
          createdAt: '2026-08-16T09:45:00.000Z',
        },
      ],
    },
    system: {
      status: 'success',
      error: null,
      data: {
        api: 'ok',
        database: 'ok',
        gateway: 'ok',
        agentsConnected: 4,
        agentsTotal: 5,
        requiredReady: 3,
        requiredTotal: 3,
        platformReady: true,
        checks: [
          { id: 'api', tone: 'ok', value: 'ok', required: true },
          { id: 'database', tone: 'ok', value: 'ok', required: true },
          { id: 'gateway', tone: 'ok', value: 'ok', required: true },
          { id: 'agents', tone: 'warning', value: '4', required: false },
        ],
      },
    },
    attention: {
      status: 'success',
      error: null,
      data: [{ id: 'agents', tone: 'warning', count: 1 }],
    },
    issues: {
      status: 'success',
      error: null,
      data: [
        {
          id: '2-no-agent',
          serverId: '2',
          serverName: 'pending-01',
          kind: 'no-agent',
          severity: 'high',
          createdAt: null,
          href: '/servers/2',
        },
      ],
    },
    weekActivity: {
      status: 'success',
      error: null,
      data: [
        { date: '2026-08-10', incidents: 0, operations: 1 },
        { date: '2026-08-11', incidents: 1, operations: 0 },
        { date: '2026-08-12', incidents: 0, operations: 0 },
        { date: '2026-08-13', incidents: 0, operations: 2 },
        { date: '2026-08-14', incidents: 0, operations: 0 },
        { date: '2026-08-15', incidents: 1, operations: 1 },
        { date: '2026-08-16', incidents: 0, operations: 0 },
      ],
    },
    connections: {
      status: 'success',
      error: null,
      data: [
        {
          id: 'a1',
          actor: 'system',
          serverName: 'web-02',
          createdAt: '2026-08-16T09:45:00.000Z',
        },
      ],
    },
    pendingOperations: 0,
    ...overrides,
  };
}

function mockMatchMedia(matches: Record<string, boolean>) {
  window.matchMedia = (query: string) => {
    const media = {
      matches: Boolean(matches[query]),
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    };
    return media as MediaQueryList;
  };
}

function renderDashboard() {
  return render(
    <LocaleProvider>
      <MemoryRouter initialEntries={['/dashboard']}>
        <AuthProvider>
          <Routes>
            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/servers" element={<div>Servers page</div>} />
              <Route path="/servers/new" element={<div>Add server page</div>} />
              <Route path="/servers/:id" element={<div>Server details</div>} />
            </Route>
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    </LocaleProvider>,
  );
}

describe('DashboardPage', () => {
  beforeEach(() => {
    fetchCurrentUserMock.mockReset();
    loadDashboardSnapshotMock.mockReset();
    listServersMock.mockReset();
    fetchCurrentUserMock.mockResolvedValue({ user: operator });
    listServersMock.mockResolvedValue({ items: [], page: 1, pageSize: 1, total: 2 });
    loadDashboardSnapshotMock.mockResolvedValue(snapshot());
    window.localStorage.setItem(LOCALE_STORAGE_KEY, 'en');
    mockMatchMedia({
      '(max-width: 767px)': false,
      '(min-width: 1280px)': true,
    });
  });

  it('renders summary, servers, chart, activity, and system status', async () => {
    renderDashboard();

    expect(await screen.findByTestId('dashboard-summary')).toHaveTextContent('5');
    expect(screen.getByRole('heading', { level: 1, name: en.dashboard.title })).toBeInTheDocument();
    expect(screen.getByTestId('dashboard-greeting')).toBeInTheDocument();
    expect(screen.getByTestId('dashboard-summary')).toHaveTextContent(en.dashboard.fleet.online);
    expect(screen.getByTestId('dashboard-resources')).toHaveTextContent(en.dashboard.resources.cpu);
    expect(screen.getByTestId('dashboard-server-1')).toHaveTextContent('prod-01');
    expect(screen.getByTestId('dashboard-server-2')).toHaveTextContent(
      en.dashboard.status['no-agent'],
    );
    expect(screen.getAllByText(en.dashboard.status.online).length).toBeGreaterThan(0);
    expect(screen.getByTestId('dashboard-connections')).toHaveTextContent('web-02');
    expect(screen.getByRole('navigation', { name: en.dashboard.nav.label })).toBeInTheDocument();
    expect(screen.getByTestId('nav-dashboard')).toHaveAttribute('href', '/dashboard');
    expect(screen.getByTestId('nav-dashboard')).toHaveAttribute('aria-current', 'page');
    expect(screen.getByTestId('nav-servers')).toHaveAttribute('href', '/servers');
    expect(screen.getByTestId('nav-servers')).not.toHaveAttribute('aria-current');
  });

  it('shows the server name instead of a generated hostname', async () => {
    loadDashboardSnapshotMock.mockResolvedValue(
      snapshot({
        servers: {
          status: 'success',
          error: null,
          data: [
            dashServer({
              id: '1',
              name: 'Production Web',
              hostname: 'yibl-udcf',
              ipAddress: '10.0.1.24',
              status: 'offline',
              sourceStatus: 'OFFLINE',
            }),
          ],
        },
      }),
    );
    renderDashboard();
    const row = await screen.findByTestId('dashboard-server-1');
    expect(row).toHaveTextContent('Production Web');
    expect(row).not.toHaveTextContent('yibl-udcf');
  });

  it('shows a loading skeleton before data arrives', async () => {
    let resolveLoad: (value: DashboardSnapshot) => void = () => undefined;
    loadDashboardSnapshotMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveLoad = resolve;
        }),
    );
    renderDashboard();

    expect(await screen.findByTestId('dashboard-loading')).toBeInTheDocument();
    expect(screen.getByTestId('dashboard-page')).toHaveAttribute('aria-busy', 'true');
    expect(screen.queryByTestId('dashboard-summary')).not.toBeInTheDocument();
    expect(screen.queryByTestId('onboarding-dashboard')).not.toBeInTheDocument();
    expect(screen.queryByText(en.dashboard.servers.emptyTitle)).not.toBeInTheDocument();
    resolveLoad(snapshot());
    expect(await screen.findByTestId('dashboard-summary')).toBeInTheDocument();
  });

  it('shows onboarding when the server list is truly empty', async () => {
    loadDashboardSnapshotMock.mockResolvedValue(
      snapshot({
        summary: emptySummary(),
        servers: { status: 'empty', data: [], error: null },
        attention: { status: 'empty', data: [], error: null },
      }),
    );
    renderDashboard();

    expect(await screen.findByTestId('onboarding-dashboard')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: en.dashboard.title })).toBeInTheDocument();
    expect(screen.getByText(en.dashboard.greeting.welcome)).toBeInTheDocument();
    expect(screen.getByTestId('setup-progress')).toHaveTextContent(en.dashboard.setup.title);
    expect(screen.getByTestId('setup-step-connection')).toBeInTheDocument();
    for (const id of ['connection', 'agent', 'access', 'ready'] as const) {
      expect(screen.getByTestId(`setup-step-${id}`).querySelector('svg')).not.toBeNull();
    }
    expect(screen.getByTestId('preview-status').querySelector('svg')).not.toBeNull();
    expect(screen.getByTestId('preview-issues').querySelector('svg')).not.toBeNull();
    expect(screen.getByTestId('unlocked-features').querySelectorAll('svg').length).toBeGreaterThan(
      4,
    );
    for (const id of ['ubuntu', 'debian', 'almalinux', 'rocky'] as const) {
      expect(screen.getByTestId(`compat-distro-${id}`).querySelector('svg')).not.toBeNull();
    }
    expect(
      screen.getByTestId('connection-illustration').querySelectorAll('svg').length,
    ).toBeGreaterThan(5);
    expect(screen.getByTestId('first-server-card')).toHaveTextContent(en.dashboard.hero.title);
    expect(screen.getByTestId('unlocked-features')).toBeInTheDocument();
    expect(screen.queryByTestId('dashboard-summary')).not.toBeInTheDocument();
    expect(screen.queryByTestId('connected-dashboard')).not.toBeInTheDocument();
    expect(screen.queryByText(en.dashboard.servers.emptyTitle)).not.toBeInTheDocument();
  });

  it('shows saved servers on the dashboard even before an agent connects', async () => {
    loadDashboardSnapshotMock.mockResolvedValue(
      snapshot({
        summary: {
          ...emptySummary(),
          total: 2,
          waitingAgent: 2,
          disconnectedAgents: 2,
          attentionCount: 2,
        },
        servers: {
          status: 'success',
          error: null,
          data: [
            dashServer({
              id: '1',
              name: 'tttt',
              status: 'no-agent',
              sourceStatus: 'PENDING',
            }),
            dashServer({
              id: '2',
              name: 'smoke-01',
              status: 'no-agent',
              sourceStatus: 'PENDING',
            }),
          ],
        },
      }),
    );
    renderDashboard();

    expect(await screen.findByTestId('connected-dashboard')).toBeInTheDocument();
    expect(screen.queryByTestId('onboarding-dashboard')).not.toBeInTheDocument();
    expect(screen.getByTestId('dashboard-server-1')).toHaveTextContent('tttt');
    expect(screen.getByTestId('dashboard-server-1')).toHaveTextContent(
      en.dashboard.status['no-agent'],
    );
    expect(screen.getByTestId('dashboard-attention')).toBeInTheDocument();
    expect(screen.queryByTestId('onboarding-dashboard')).not.toBeInTheDocument();
  });

  it('does not treat a server API error as an empty fleet', async () => {
    loadDashboardSnapshotMock.mockResolvedValue(
      snapshot({
        servers: { status: 'error', data: null, error: 'generic' },
      }),
    );

    renderDashboard();
    expect(await screen.findByTestId('dashboard-load-error')).toHaveTextContent(
      en.dashboard.loadError.title,
    );
    expect(screen.getByText(en.dashboard.loadError.body)).toBeInTheDocument();
    expect(screen.queryByTestId('onboarding-dashboard')).not.toBeInTheDocument();
    expect(screen.queryByTestId('connected-dashboard')).not.toBeInTheDocument();
    expect(screen.queryByTestId('dashboard-summary')).not.toBeInTheDocument();
    expect(loadDashboardSnapshotMock.mock.calls.length).toBeGreaterThanOrEqual(3);

    loadDashboardSnapshotMock.mockResolvedValue(snapshot());
    fireEvent.click(screen.getByTestId('dashboard-error-retry'));
    expect(await screen.findByTestId('connected-dashboard')).toBeInTheDocument();
    expect(screen.getByTestId('dashboard-server-1')).toHaveTextContent('prod-01');
  });

  it('retries a failed initial dashboard load instead of showing a false outage', async () => {
    loadDashboardSnapshotMock
      .mockResolvedValueOnce(
        snapshot({
          servers: { status: 'error', data: null, error: 'generic' },
          system: { status: 'error', data: null, error: 'network' },
        }),
      )
      .mockResolvedValueOnce(snapshot());

    renderDashboard();
    expect(await screen.findByTestId('connected-dashboard')).toBeInTheDocument();
    expect(screen.queryByTestId('servers-list-warning')).not.toBeInTheDocument();
    expect(screen.queryByTestId('platform-health-warning')).not.toBeInTheDocument();
  });

  it('does not start a second refresh while one is in flight', async () => {
    renderDashboard();
    await screen.findByTestId('dashboard-summary');

    let resolveRefresh: (value: DashboardSnapshot) => void = () => undefined;
    loadDashboardSnapshotMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRefresh = resolve;
        }),
    );

    fireEvent.click(screen.getByTestId('dashboard-refresh'));
    fireEvent.click(screen.getByTestId('dashboard-refresh'));
    expect(loadDashboardSnapshotMock).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId('dashboard-refresh')).toBeDisabled();
    resolveRefresh(snapshot());
    await waitFor(() => expect(screen.getByTestId('dashboard-refresh')).toBeEnabled());
  });

  it('switches the chart period without a full-page skeleton', async () => {
    renderDashboard();
    await screen.findByTestId('dashboard-period');

    fireEvent.change(screen.getByTestId('dashboard-period'), { target: { value: '1h' } });
    expect(loadDashboardSnapshotMock).toHaveBeenLastCalledWith('1h');
    expect(screen.queryByTestId('dashboard-loading')).not.toBeInTheDocument();
    expect(screen.getByTestId('dashboard-period')).toHaveValue('1h');
  });

  it('opens the mobile drawer, traps focus, and closes on Escape', async () => {
    mockMatchMedia({
      '(max-width: 767px)': true,
      '(min-width: 1280px)': false,
    });
    renderDashboard();
    await screen.findByTestId('dashboard-page');

    const menu = screen.getByTestId('dashboard-menu');
    fireEvent.click(menu);
    expect(screen.getByTestId('dashboard-sidebar').className).toMatch(/sidebarOpen/);
    expect(screen.getByTestId('dashboard-overlay')).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByTestId('dashboard-overlay')).not.toBeInTheDocument());
    expect(menu).toHaveFocus();
  });

  it('localizes the dashboard into Ukrainian', async () => {
    renderDashboard();
    await screen.findByTestId('dashboard-summary');

    fireEvent.click(screen.getByRole('button', { name: en.common.language.switcher }));
    fireEvent.click(screen.getByRole('option', { name: 'UA' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: uk.dashboard.title }),
    ).toBeInTheDocument();
    expect(screen.getAllByText(uk.dashboard.fleet.online).length).toBeGreaterThan(0);
    expect(document.documentElement.lang).toBe('uk');
  });

  it('expands microservice modules from the sidebar', async () => {
    renderDashboard();
    await screen.findByTestId('connected-dashboard');

    expect(screen.getByTestId('nav-leaf-all-servers')).toHaveAttribute('href', '/servers');
    expect(screen.getByTestId('nav-leaf-spaces')).toHaveAttribute('href', '/server-spaces');
    expect(screen.getByTestId('nav-leaf-ssh-keys')).toHaveAttribute('href', '/server-ssh-keys');
    fireEvent.click(screen.getByTestId('nav-toggle-servers'));
    expect(screen.getByTestId('nav-toggle-servers')).toHaveAttribute('aria-expanded', 'false');
  });

  it('keeps period controls available when metric history is missing', async () => {
    loadDashboardSnapshotMock.mockResolvedValue(
      snapshot({
        load: {
          status: 'empty',
          error: null,
          data: {
            points: [],
            currentCpu: 11,
            currentRam: 25,
            lastMetricAt: '2026-08-16T09:36:00.000Z',
          },
        },
      }),
    );
    renderDashboard();

    expect(await screen.findByTestId('dashboard-resources')).toHaveTextContent(
      en.dashboard.resources.noHistory,
    );
    expect(screen.getByTestId('dashboard-period')).toBeEnabled();
  });

  it('opens all servers from the ranking', async () => {
    renderDashboard();
    await screen.findByTestId('dashboard-top-loaded');

    expect(screen.getByTestId('dashboard-open-servers')).toHaveAttribute('href', '/servers');
    fireEvent.click(screen.getByTestId('dashboard-open-servers'));
    expect(await screen.findByText('Servers page')).toBeInTheDocument();
  });

  it('collapses the desktop sidebar to icons only', async () => {
    renderDashboard();
    await screen.findByTestId('dashboard-sidebar');

    expect(screen.getByTestId('dashboard-sidebar')).toHaveAttribute('data-collapsed', 'false');
    expect(
      within(screen.getByTestId('dashboard-sidebar')).getByText('LinuxPilot'),
    ).toBeInTheDocument();
    expect(
      within(screen.getByTestId('dashboard-sidebar')).getByText(en.dashboard.nav.overview),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('dashboard-sidebar-collapse'));
    expect(screen.getByTestId('dashboard-sidebar')).toHaveAttribute('data-collapsed', 'true');
    expect(
      within(screen.getByTestId('dashboard-sidebar')).queryByText('LinuxPilot'),
    ).not.toBeInTheDocument();
    expect(
      within(screen.getByTestId('dashboard-sidebar')).queryByText(en.dashboard.nav.overview),
    ).not.toBeInTheDocument();
    expect(
      within(screen.getByTestId('dashboard-sidebar')).queryByText(
        en.dashboard.nav.sections.microservices,
      ),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId('dashboard-sidebar-collapse')).toHaveAccessibleName(
      en.dashboard.actions.expandSidebar,
    );
  });

  it('exposes accessible landmarks and labels', async () => {
    renderDashboard();
    await screen.findByTestId('dashboard-summary');

    expect(screen.getAllByRole('banner').length).toBeGreaterThan(0);
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: en.dashboard.title })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: en.dashboard.fleet.title }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(en.dashboard.actions.refresh)).toBeInTheDocument();
    expect(
      within(screen.getByTestId('dashboard-summary')).getByRole('img', {
        name: (value) => value.includes(en.dashboard.fleet.chartLabel),
      }),
    ).toBeInTheDocument();
  });

  it('opens the enrollment wizard from onboarding and keeps the token out of storage', async () => {
    loadDashboardSnapshotMock.mockResolvedValue(
      snapshot({
        summary: emptySummary(),
        servers: { status: 'empty', data: [], error: null },
      }),
    );
    renderDashboard();
    expect(await screen.findByTestId('onboarding-dashboard')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('onboarding-add-server'));
    expect(await screen.findByTestId('enrollment-wizard')).toBeInTheDocument();
    expect(screen.getByTestId('enrollment-wizard').className).toMatch(/dialog/);
    expect(window.localStorage.getItem('enrollment-token')).toBeNull();
    expect(window.location.href).not.toMatch(/token=/);
  });

  it('opens the import dialog from onboarding without changing the URL', async () => {
    loadDashboardSnapshotMock.mockResolvedValue(
      snapshot({
        summary: emptySummary(),
        servers: { status: 'empty', data: [], error: null },
      }),
    );
    renderDashboard();
    expect(await screen.findByTestId('onboarding-dashboard')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('onboarding-import'));
    expect(await screen.findByTestId('import-config-dialog')).toBeInTheDocument();
    expect(screen.queryByTestId('enrollment-wizard')).not.toBeInTheDocument();
    expect(screen.getByTestId('onboarding-dashboard')).toBeInTheDocument();
    expect(screen.queryByText('Servers page')).not.toBeInTheDocument();
  });

  it('localizes onboarding copy into Ukrainian', async () => {
    loadDashboardSnapshotMock.mockResolvedValue(
      snapshot({
        servers: { status: 'empty', data: [], error: null },
        summary: emptySummary(),
      }),
    );
    renderDashboard();
    await screen.findByTestId('onboarding-dashboard');

    fireEvent.click(screen.getByRole('button', { name: en.common.language.switcher }));
    fireEvent.click(screen.getByRole('option', { name: 'UA' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: uk.dashboard.title }),
    ).toBeInTheDocument();
    expect(screen.getByText(uk.dashboard.hero.title)).toBeInTheDocument();
  });

  it('hides add-server actions when the user cannot create servers', async () => {
    fetchCurrentUserMock.mockResolvedValue({
      user: { ...operator, permissions: ['servers.view'] },
    });
    loadDashboardSnapshotMock.mockResolvedValue(
      snapshot({
        summary: emptySummary(),
        servers: { status: 'empty', data: [], error: null },
      }),
    );
    renderDashboard();
    expect(await screen.findByTestId('onboarding-dashboard')).toBeInTheDocument();
    expect(screen.queryByTestId('onboarding-add-server')).not.toBeInTheDocument();
    expect(screen.getByText(en.dashboard.permissions.askAdmin)).toBeInTheDocument();
  });

  it('opens the command palette from the header', async () => {
    renderDashboard();
    await screen.findByTestId('connected-dashboard');
    fireEvent.click(screen.getByTestId('dashboard-command-open'));
    expect(await screen.findByTestId('dashboard-command-dialog')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('dashboard-command-servers'));
    expect(await screen.findByText('Servers page')).toBeInTheDocument();
  });
});
