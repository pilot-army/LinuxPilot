import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resources } from '@linuxpilot/i18n';
import { AuthProvider } from '../../auth/AuthProvider';
import { ProtectedRoute } from '../../auth/ProtectedRoute';
import { LocaleProvider, LOCALE_STORAGE_KEY } from '../../i18n';
import { ApiRequestError } from '../../api/client';
import { testUser } from '../../test/auth-fixtures';
import { ServerSshKeysPage } from './server-ssh-keys-page';

const en = resources.en;

const { fetchCurrentUserMock, listSshKeysMock, generateSshKeyMock } = vi.hoisted(() => ({
  fetchCurrentUserMock: vi.fn(),
  listSshKeysMock: vi.fn(),
  generateSshKeyMock: vi.fn(),
}));

vi.mock('../../api/auth', () => ({
  login: vi.fn(),
  fetchCurrentUser: fetchCurrentUserMock,
  logout: vi.fn(),
}));

vi.mock('../../api/ssh-keys', () => ({
  listSshKeys: listSshKeysMock,
  inspectSshKey: vi.fn(),
  importPrivateSshKey: vi.fn(),
  addPublicSshKey: vi.fn(),
  generateSshKey: generateSshKeyMock,
  getSshKey: vi.fn(),
  getSshKeyUsages: vi.fn(),
  updateSshKey: vi.fn(),
  disableSshKey: vi.fn(),
  deleteSshKey: vi.fn(),
  installSshKey: vi.fn(),
  rotateSshKey: vi.fn(),
}));

function renderPage(permissions: string[]) {
  fetchCurrentUserMock.mockResolvedValue({ user: { ...testUser, permissions } });
  window.localStorage.setItem(LOCALE_STORAGE_KEY, 'en');
  return render(
    <LocaleProvider>
      <AuthProvider>
        <MemoryRouter initialEntries={['/server-ssh-keys']}>
          <Routes>
            <Route element={<ProtectedRoute />}>
              <Route path="/server-ssh-keys" element={<ServerSshKeysPage />} />
            </Route>
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </LocaleProvider>,
  );
}

describe('ServerSshKeysPage', () => {
  beforeEach(() => {
    listSshKeysMock.mockReset();
    generateSshKeyMock.mockReset();
  });

  it('shows onboarding when there are no keys and no servers are required', async () => {
    listSshKeysMock.mockResolvedValue({
      items: [],
      page: 1,
      pageSize: 20,
      total: 0,
      summary: {
        total: 0,
        used: 0,
        unused: 0,
        attention: 0,
        rotationDue: 0,
        passwordAuthServers: 0,
      },
    });
    renderPage(['ssh_keys.read', 'ssh_keys.create']);
    expect(await screen.findByTestId('ssh-keys-empty')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: en.servers.sshKeys.emptyTitle }),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('ssh-keys-summary')).not.toBeInTheDocument();
    expect(screen.getByTestId('empty-import-key')).toBeInTheDocument();
    expect(screen.getByTestId('empty-generate-key')).toBeInTheDocument();
  });

  it('does not show empty state while the first request is in flight', async () => {
    let resolveList: (value: unknown) => void = () => undefined;
    listSshKeysMock.mockReturnValue(
      new Promise((resolve) => {
        resolveList = resolve;
      }),
    );
    renderPage(['ssh_keys.read']);
    expect(await screen.findByTestId('ssh-keys-skeleton')).toBeInTheDocument();
    expect(screen.queryByTestId('ssh-keys-empty')).not.toBeInTheDocument();
    resolveList({
      items: [],
      page: 1,
      pageSize: 20,
      total: 0,
      summary: {
        total: 0,
        used: 0,
        unused: 0,
        attention: 0,
        rotationDue: 0,
        passwordAuthServers: 0,
      },
    });
    expect(await screen.findByTestId('ssh-keys-empty')).toBeInTheDocument();
  });

  it('shows an error with retry', async () => {
    listSshKeysMock.mockRejectedValue(new Error('fail'));
    renderPage(['ssh_keys.read']);
    expect(await screen.findByTestId('ssh-keys-error')).toHaveTextContent(
      en.servers.sshKeys.loadError,
    );
    fireEvent.click(screen.getByText(en.servers.sshKeys.retry));
    await waitFor(() => expect(listSshKeysMock).toHaveBeenCalledTimes(2));
  });

  it('explains a forbidden list response', async () => {
    listSshKeysMock.mockRejectedValue(new ApiRequestError(403, 'AUTH_FORBIDDEN', 'no'));
    renderPage(['ssh_keys.read']);
    expect(await screen.findByTestId('ssh-keys-error')).toHaveTextContent(
      en.servers.sshKeys.forbidden,
    );
  });

  it('renders a compact summary and hides disabled keys from the add flow', async () => {
    listSshKeysMock.mockResolvedValue({
      items: [
        {
          id: 'k1',
          name: 'Production Deploy',
          description: 'prod',
          type: 'generated_keypair',
          algorithm: 'ed25519',
          keySize: 256,
          fingerprint: 'SHA256:AbCdEfGh',
          publicKey: 'ssh-ed25519 AAAA prod',
          status: 'active',
          tags: [],
          source: 'generate',
          createdByUserId: 'user-1',
          createdAt: '2026-08-18T08:00:00.000Z',
          updatedAt: '2026-08-18T08:00:00.000Z',
          lastUsedAt: null,
          rotatedAt: null,
          rotationDueAt: null,
          version: 1,
          usage: { servers: 2, spaces: 1, templates: 0, bastions: 0, operations: 0 },
        },
      ],
      page: 1,
      pageSize: 20,
      total: 1,
      summary: {
        total: 1,
        used: 1,
        unused: 0,
        attention: 0,
        rotationDue: 0,
        passwordAuthServers: 0,
      },
    });
    renderPage(['ssh_keys.read', 'ssh_keys.create']);
    expect(await screen.findByTestId('ssh-keys-summary')).toBeInTheDocument();
    expect(screen.getByText('Production Deploy')).toBeInTheDocument();
    expect(screen.getByTestId('ssh-key-status-active')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('add-ssh-key-menu'));
    expect(screen.getByRole('menuitem', { name: en.servers.sshKeys.generate })).toBeInTheDocument();
    expect(screen.queryByText(/SSH Agent/i)).not.toBeInTheDocument();
  });
});
