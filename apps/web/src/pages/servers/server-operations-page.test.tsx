import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resources } from '@linuxpilot/i18n';
import { AuthProvider } from '../../auth/AuthProvider';
import { ProtectedRoute } from '../../auth/ProtectedRoute';
import { LocaleProvider, LOCALE_STORAGE_KEY } from '../../i18n';
import { testUser } from '../../test/auth-fixtures';
import { ServerAuditPage } from './server-audit-page';
import { ServerOperationsPage } from './server-operations-page';

const en = resources.en;

const {
  fetchCurrentUserMock,
  listServerOperationsMock,
  listServerAuditMock,
  listServersMock,
  createServerOperationMock,
} = vi.hoisted(() => ({
  fetchCurrentUserMock: vi.fn(),
  listServerOperationsMock: vi.fn(),
  listServerAuditMock: vi.fn(),
  listServersMock: vi.fn(),
  createServerOperationMock: vi.fn(),
}));

vi.mock('../../api/auth', () => ({
  login: vi.fn(),
  fetchCurrentUser: fetchCurrentUserMock,
  logout: vi.fn(),
}));

vi.mock('../../api/servers', () => ({
  listServerOperations: listServerOperationsMock,
  listServerAudit: listServerAuditMock,
  listServers: listServersMock,
  createServerOperation: createServerOperationMock,
  listServerGroups: vi.fn().mockResolvedValue({ items: [], ungroupedCount: 0 }),
}));

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

function renderAt(path: string, permissions: string[]) {
  fetchCurrentUserMock.mockResolvedValue({ user: { ...testUser, permissions } });
  window.localStorage.setItem(LOCALE_STORAGE_KEY, 'en');
  return render(
    <LocaleProvider>
      <AuthProvider>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route element={<ProtectedRoute />}>
              <Route path="/server-operations" element={<ServerOperationsPage />} />
              <Route path="/server-audit" element={<ServerAuditPage />} />
              <Route path="/servers/:id" element={<div>Server details</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </LocaleProvider>,
  );
}

describe('server operations and audit pages', () => {
  beforeEach(() => {
    mockMatchMedia(false);
    listServersMock.mockResolvedValue({ items: [], page: 1, pageSize: 100, total: 0 });
    listServerOperationsMock.mockResolvedValue({ items: [], page: 1, pageSize: 25, total: 0 });
    listServerAuditMock.mockResolvedValue({ items: [], page: 1, pageSize: 25, total: 0 });
    createServerOperationMock.mockResolvedValue({ id: 'op-new' });
  });

  it('uses the dashboard shell and empty state for operations', async () => {
    renderAt('/server-operations', ['servers.view', 'servers.update']);
    expect(await screen.findByTestId('dashboard-sidebar')).toBeInTheDocument();
    expect(screen.getByTestId('section-operations')).toHaveAttribute('aria-current', 'page');
    expect(screen.getByTestId('nav-leaf-operations')).toHaveAttribute('aria-current', 'page');
    expect(screen.getByTestId('nav-servers')).not.toHaveAttribute('aria-current');
    expect(await screen.findByTestId('operations-empty')).toHaveTextContent(
      en.servers.operations.emptyTitle,
    );
    expect(screen.queryByTestId('operations-table')).not.toBeInTheDocument();
    expect(screen.getByTestId('create-operation')).toBeInTheDocument();
  });

  it('lists operations, restores filters, and opens the inspector', async () => {
    listServerOperationsMock.mockResolvedValue({
      items: [
        {
          id: 'op1',
          serverId: 's1',
          serverName: 'prod-web-01',
          type: 'REBOOT',
          status: 'FAILED',
          requestedBy: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
          idempotencyKey: 'idem-1234567890abcdef',
          payload: { token: 'secret', reason: 'scheduled' },
          createdAt: '2026-08-16T09:00:00.000Z',
          deliveredAt: '2026-08-16T09:00:01.000Z',
          startedAt: '2026-08-16T09:00:02.000Z',
          completedAt: '2026-08-16T09:00:10.000Z',
          expiresAt: '2026-08-16T10:00:00.000Z',
          errorCode: 'AGENT_TIMEOUT',
          result: { signature: 'abc', ok: false },
          version: 1,
        },
      ],
      page: 1,
      pageSize: 25,
      total: 1,
    });
    renderAt('/server-operations?status=failed&operationId=op1', [
      'servers.view',
      'servers.update',
    ]);
    expect(await screen.findByTestId('operations-table')).toHaveTextContent('prod-web-01');
    expect(screen.getByTestId('operations-inspector')).toBeInTheDocument();
    expect(screen.getByTestId('operations-inspector')).not.toHaveTextContent('secret');
    expect(screen.getByTestId('operations-inspector')).not.toHaveTextContent('signature');
    expect(screen.getByText(en.servers.operations.retry)).toBeInTheDocument();
  });

  it('keeps filters on retry after an operations error', async () => {
    listServerOperationsMock.mockRejectedValueOnce(new Error('down'));
    renderAt('/server-operations?status=FAILED', ['servers.view']);
    expect(await screen.findByTestId('operations-error')).toHaveTextContent(
      en.servers.operations.errorTitle,
    );
    listServerOperationsMock.mockResolvedValue({ items: [], page: 1, pageSize: 25, total: 0 });
    fireEvent.click(screen.getByText(en.servers.list.retry));
    await waitFor(() => expect(listServerOperationsMock.mock.calls.length).toBeGreaterThan(1));
    expect(listServerOperationsMock.mock.calls.at(-1)?.[0].get('status')).toBe('FAILED');
  });

  it('hides audit without audit.view and does not fetch', async () => {
    renderAt('/server-audit', ['servers.view']);
    expect(await screen.findByTestId('audit-forbidden')).toHaveTextContent(
      en.servers.auditPage.forbidden,
    );
    expect(listServerAuditMock).not.toHaveBeenCalled();
  });

  it('renders audit as read-only with sanitized metadata', async () => {
    listServerAuditMock.mockResolvedValue({
      items: [
        {
          id: 'e1',
          action: 'AGENT_REVOKED',
          actorId: 'user-1',
          requestId: 'req-123456789',
          createdAt: '2026-08-16T09:10:00.000Z',
          metadata: { token: 'secret', cookie: 'sid', reason: 'rotated' },
          targetType: 'server',
          targetId: 's1',
          serverId: 's1',
          result: 'success',
        },
      ],
      page: 1,
      pageSize: 25,
      total: 1,
    });
    renderAt('/server-audit?action=AGENT_REVOKED&eventId=e1', ['audit.view', 'servers.view']);
    expect(await screen.findByTestId('audit-list')).toBeInTheDocument();
    expect(screen.getByTestId('dashboard-sidebar')).toBeInTheDocument();
    expect(screen.getByTestId('audit-inspector')).toHaveTextContent('rotated');
    expect(screen.getByTestId('audit-inspector')).not.toHaveTextContent('secret');
    expect(screen.queryByTestId('create-operation')).not.toBeInTheDocument();
  });

  it('shows an audit error instead of an empty log', async () => {
    listServerAuditMock.mockRejectedValueOnce(new Error('down'));
    renderAt('/server-audit', ['audit.view']);
    expect(await screen.findByTestId('audit-error')).toHaveTextContent(
      en.servers.auditPage.errorTitle,
    );
    expect(screen.queryByTestId('audit-empty')).not.toBeInTheDocument();
  });
});
