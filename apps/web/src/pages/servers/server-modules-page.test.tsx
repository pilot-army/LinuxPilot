import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resources } from '@linuxpilot/i18n';
import { AuthProvider } from '../../auth/AuthProvider';
import { ProtectedRoute } from '../../auth/ProtectedRoute';
import { LocaleProvider, LOCALE_STORAGE_KEY } from '../../i18n';
import { testUser } from '../../test/auth-fixtures';
import { AddServerPage } from './add-server-page';
import { ServerAuditPage } from './server-audit-page';
import { ServerDetailPage } from './server-detail-page';
import { ServerGroupsPage } from './server-groups-page';

const {
  fetchCurrentUserMock,
  listServerGroupsMock,
  listServerAuditMock,
  getServerMock,
  getServerHealthMock,
  getServerMetricsMock,
  getServerEventsMock,
  createServerMock,
  createEnrollmentTokenMock,
} = vi.hoisted(() => ({
  fetchCurrentUserMock: vi.fn(),
  listServerGroupsMock: vi.fn(),
  listServerAuditMock: vi.fn(),
  getServerMock: vi.fn(),
  getServerHealthMock: vi.fn(),
  getServerMetricsMock: vi.fn(),
  getServerEventsMock: vi.fn(),
  createServerMock: vi.fn(),
  createEnrollmentTokenMock: vi.fn(),
}));

vi.mock('../../api/auth', () => ({
  login: vi.fn(),
  fetchCurrentUser: fetchCurrentUserMock,
  logout: vi.fn(),
}));

vi.mock('../../api/servers', () => ({
  listServerGroups: listServerGroupsMock,
  getServerGroup: vi.fn(),
  listServers: vi.fn().mockResolvedValue({ items: [], page: 1, pageSize: 5, total: 0 }),
  createServerGroup: vi.fn(),
  updateServerGroup: vi.fn(),
  deleteServerGroup: vi.fn(),
  bulkAssignGroup: vi.fn(),
  assignServerGroup: vi.fn(),
  listServerAudit: listServerAuditMock,
  getServer: getServerMock,
  getServerHealth: getServerHealthMock,
  getServerMetrics: getServerMetricsMock,
  getServerEvents: getServerEventsMock,
  getServerAudit: vi.fn().mockResolvedValue({ items: [] }),
  getServerUpdates: vi.fn().mockResolvedValue({
    availableUpdates: 0,
    securityUpdates: 0,
    lastCheckedAt: null,
    rebootRequired: false,
    packages: [],
    currentAgentVersion: null,
    availableAgentVersion: null,
  }),
  listServerOperationsFor: vi
    .fn()
    .mockResolvedValue({ items: [], page: 1, pageSize: 20, total: 0 }),
  createServer: createServerMock,
  updateServer: vi.fn().mockResolvedValue({ id: 'srv-1', name: 'edge-01' }),
  createEnrollmentToken: createEnrollmentTokenMock,
}));

function renderAt(path: string, permissions: string[]) {
  fetchCurrentUserMock.mockResolvedValue({ user: { ...testUser, permissions } });
  window.localStorage.setItem(LOCALE_STORAGE_KEY, 'en');
  return render(
    <LocaleProvider>
      <AuthProvider>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route element={<ProtectedRoute />}>
              <Route path="/server-spaces" element={<ServerGroupsPage />} />
              <Route path="/server-groups" element={<ServerGroupsPage />} />
              <Route path="/server-audit" element={<ServerAuditPage />} />
              <Route path="/servers/:id" element={<ServerDetailPage />} />
              <Route path="/servers/new" element={<AddServerPage />} />
              <Route path="/servers/:id/:tab" element={<ServerDetailPage />} />
            </Route>
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </LocaleProvider>,
  );
}

describe('server module pages', () => {
  beforeEach(() => {
    listServerGroupsMock.mockResolvedValue({ items: [], ungroupedCount: 0 });
    listServerAuditMock.mockResolvedValue({ items: [] });
    getServerMock.mockResolvedValue({
      id: '1',
      name: 'prod-web-01',
      hostname: 'prod-web-01',
      primaryIp: '10.0.1.11',
      description: '',
      status: 'ONLINE',
      agentStatus: 'CONNECTED',
      osName: 'Ubuntu',
      osVersion: '24.04',
      kernelVersion: null,
      architecture: null,
      cpuCores: 4,
      agentVersion: '1.8.2',
      lastSeenAt: '2026-08-16T09:00:00.000Z',
      createdAt: '2026-08-16T08:00:00.000Z',
      updatedAt: '2026-08-16T09:00:00.000Z',
      tags: [],
      groupId: null,
      groupName: null,
      spaceId: null,
      spaceName: null,
      maintenanceMode: false,
      version: 1,
      credentialId: 'cred',
      cpuUsagePercent: 10,
      memoryUsedBytes: null,
      memoryTotalBytes: null,
      diskUsedBytes: null,
      diskTotalBytes: null,
      uptimeSeconds: 100,
      latestMetric: null,
    });
    getServerHealthMock.mockResolvedValue({ status: 'OK', reasons: [] });
    getServerMetricsMock.mockResolvedValue({ items: [] });
    getServerEventsMock.mockResolvedValue({ items: [], page: 1, pageSize: 20, total: 0 });
    createServerMock.mockResolvedValue({ id: 'srv-1', name: 'edge-01' });
    createEnrollmentTokenMock.mockResolvedValue({
      token: 'one-time-secret-token',
      expiresAt: '2026-08-16T12:00:00.000Z',
      enrollCommand: 'linuxpilot-agent enroll --stdin',
    });
  });

  it('lists groups', async () => {
    renderAt('/server-spaces', ['servers.view', 'servers.update']);
    await waitFor(() => expect(listServerGroupsMock).toHaveBeenCalled());
    expect(
      screen.getByRole('heading', { level: 1, name: resources.en.servers.groups.title }),
    ).toBeInTheDocument();
  });

  it('hides audit for users without audit.view', async () => {
    renderAt('/server-audit', ['servers.view']);
    expect(await screen.findByTestId('audit-forbidden')).toHaveTextContent(
      resources.en.servers.auditPage.forbidden,
    );
    expect(listServerAuditMock).not.toHaveBeenCalled();
  });

  it('walks the enrollment wizard and keeps the token out of storage', async () => {
    getServerMock.mockResolvedValue({
      id: 'srv-1',
      status: 'PENDING',
      agentStatus: 'NOT_INSTALLED',
    });
    renderAt('/servers/new', ['servers.create']);
    fireEvent.change(await screen.findByTestId('server-name'), { target: { value: 'edge-01' } });
    fireEvent.change(screen.getByTestId('server-address'), { target: { value: '192.0.2.10' } });
    expect(screen.queryByTestId('server-environment')).not.toBeInTheDocument();
    expect(screen.getByTestId('space-select')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('enrollment-next'));
    fireEvent.click(screen.getByTestId('check-connection'));
    await waitFor(() =>
      expect(screen.getByTestId('connection-check-status')).toHaveTextContent(
        resources.en.servers.create.checkReady,
      ),
    );
    fireEvent.click(screen.getByTestId('enrollment-next'));
    fireEvent.click(screen.getByTestId('install-mode-manual'));
    fireEvent.click(screen.getByTestId('enrollment-next'));
    fireEvent.click(screen.getByTestId('confirm-add'));
    fireEvent.click(screen.getByTestId('create-server'));
    expect(await screen.findByTestId('enrollment-token-panel')).toBeInTheDocument();
    expect(screen.getByTestId('enroll-command')).not.toHaveTextContent('one-time-secret-token');
    expect(window.localStorage.getItem('enrollment-token')).toBeNull();
    expect(window.sessionStorage.length).toBe(0);
    expect(createServerMock).toHaveBeenCalled();
  });

  it('shows an empty metrics state instead of invented points', async () => {
    renderAt('/servers/1/metrics', ['servers.view']);
    expect(await screen.findByTestId('metrics-empty')).toHaveTextContent(
      resources.en.servers.detail.metricsEmpty,
    );
  });
});
