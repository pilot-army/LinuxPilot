import { useState } from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resources } from '@linuxpilot/i18n';
import { AuthProvider } from '../../../auth/AuthProvider';
import { ProtectedRoute } from '../../../auth/ProtectedRoute';
import { LocaleProvider, LOCALE_STORAGE_KEY } from '../../../i18n';
import { testUser } from '../../../test/auth-fixtures';
import { ApiRequestError } from '../../../api/client';
import { EnrollmentWizard } from './enrollment-wizard';

const en = resources.en;
const uk = resources.uk;

const {
  fetchCurrentUserMock,
  createServerMock,
  updateServerMock,
  createEnrollmentTokenMock,
  getServerMock,
  listServerGroupsMock,
  createServerGroupMock,
} = vi.hoisted(() => ({
  fetchCurrentUserMock: vi.fn(),
  createServerMock: vi.fn(),
  updateServerMock: vi.fn(),
  createEnrollmentTokenMock: vi.fn(),
  getServerMock: vi.fn(),
  listServerGroupsMock: vi.fn(),
  createServerGroupMock: vi.fn(),
}));

vi.mock('../../../api/auth', () => ({
  login: vi.fn(),
  fetchCurrentUser: fetchCurrentUserMock,
  logout: vi.fn(),
}));

vi.mock('../../../api/servers', () => ({
  createServer: createServerMock,
  updateServer: updateServerMock,
  createEnrollmentToken: createEnrollmentTokenMock,
  getServer: getServerMock,
  listServerGroups: listServerGroupsMock,
  createServerGroup: createServerGroupMock,
}));

vi.mock('../../../features/enrollment/constants', () => ({
  NAME_MIN: 1,
  NAME_MAX: 80,
  DESCRIPTION_MAX: 240,
  HOSTNAME_MAX: 255,
  OS_VERSION_MAX: 32,
  MAX_TAGS: 16,
  SSH_PORT_MIN: 1,
  SSH_PORT_MAX: 65535,
  POLL_MS: 5,
  POLL_HIDDEN_MS: 5,
  POLL_LIMIT: 2,
  TOKEN_WARN_MS: 60_000,
}));

const operator = {
  ...testUser,
  permissions: ['servers.view', 'servers.create', 'servers.update'],
};

function renderWizard(props: { open?: boolean; onClose?: () => void } = {}) {
  return render(
    <LocaleProvider>
      <MemoryRouter initialEntries={['/dashboard']}>
        <AuthProvider>
          <Routes>
            <Route element={<ProtectedRoute />}>
              <Route
                path="/dashboard"
                element={
                  <EnrollmentWizard
                    variant="dialog"
                    open={props.open ?? true}
                    onClose={props.onClose ?? (() => undefined)}
                  />
                }
              />
              <Route path="/servers" element={<div>Servers list</div>} />
              <Route path="/servers/:id" element={<div>Server details</div>} />
            </Route>
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    </LocaleProvider>,
  );
}

function Host() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" data-testid="opener" onClick={() => setOpen(true)}>
        {en.dashboard.actions.addServer}
      </button>
      <EnrollmentWizard variant="dialog" open={open} onClose={() => setOpen(false)} />
    </>
  );
}

async function fillBasics() {
  fireEvent.change(await screen.findByTestId('server-name'), { target: { value: 'edge-01' } });
  fireEvent.change(screen.getByTestId('server-address'), { target: { value: '192.0.2.10' } });
}

async function passConnection() {
  fireEvent.click(screen.getByTestId('check-connection'));
  await waitFor(() =>
    expect(screen.getByTestId('connection-check-status')).toHaveTextContent(
      en.servers.create.checkReady,
    ),
  );
}

async function goToReview(options?: { manual?: boolean; none?: boolean }) {
  await fillBasics();
  fireEvent.click(screen.getByTestId('enrollment-next'));
  await passConnection();
  fireEvent.click(screen.getByTestId('enrollment-next'));
  if (options?.manual) {
    fireEvent.click(screen.getByTestId('install-mode-manual'));
  }
  if (options?.none) {
    fireEvent.click(screen.getByTestId('install-mode-none'));
    fireEvent.click(screen.getByTestId('confirm-no-agent'));
  }
  fireEvent.click(screen.getByTestId('enrollment-next'));
}

async function submitWizard(options?: { manual?: boolean; none?: boolean }) {
  await goToReview(options);
  fireEvent.click(screen.getByTestId('confirm-add'));
  fireEvent.click(screen.getByTestId('create-server'));
}

describe('EnrollmentWizard', () => {
  beforeEach(() => {
    fetchCurrentUserMock.mockReset();
    createServerMock.mockReset();
    updateServerMock.mockReset();
    createEnrollmentTokenMock.mockReset();
    getServerMock.mockReset();
    listServerGroupsMock.mockReset();
    createServerGroupMock.mockReset();
    fetchCurrentUserMock.mockResolvedValue({ user: operator });
    listServerGroupsMock.mockResolvedValue({
      items: [{ id: 'grp-1', name: 'Production', tags: ['prod'] }],
    });
    createServerMock.mockResolvedValue({ id: 'srv-1', name: 'edge-01', status: 'PENDING' });
    updateServerMock.mockResolvedValue({ id: 'srv-1', name: 'edge-01', status: 'PENDING' });
    createEnrollmentTokenMock.mockResolvedValue({
      serverId: 'srv-1',
      token: 'one-time-token',
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      installCommand: 'linuxpilot-agent install --user linuxpilot',
      enrollCommand: 'linuxpilot-agent enroll --stdin',
    });
    getServerMock.mockResolvedValue({
      id: 'srv-1',
      status: 'PENDING',
      agentStatus: 'NOT_INSTALLED',
    });
    window.localStorage.setItem(LOCALE_STORAGE_KEY, 'en');
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
  });

  it('opens as a four-step dialog', async () => {
    renderWizard();
    expect(await screen.findByTestId('enrollment-wizard')).toBeInTheDocument();
    expect(screen.getByTestId('enrollment-wizard').className).toMatch(/dialog/);
    expect(screen.getByTestId('add-server-stepper')).toBeInTheDocument();
    expect(screen.getByTestId('wizard-mobile-bar')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByTestId('wizard-nav-1')).toHaveAttribute('aria-current', 'step');
  });

  it('validates step 1 on submit and not on empty open', async () => {
    renderWizard();
    await screen.findByTestId('server-name');
    expect(screen.queryByText(en.servers.create.nameRequired)).not.toBeInTheDocument();
    expect(screen.getByTestId('enrollment-next')).toBeDisabled();
    fireEvent.submit(screen.getByTestId('server-name').closest('form')!);
    expect(await screen.findByText(en.servers.create.nameRequired)).toBeInTheDocument();
    expect(screen.getByTestId('server-name')).toHaveAttribute('aria-invalid', 'true');
  });

  it('accepts IPv4, IPv6, and hostname addresses', async () => {
    renderWizard();
    fireEvent.change(await screen.findByTestId('server-name'), { target: { value: 'edge-01' } });
    const address = screen.getByTestId('server-address');
    fireEvent.change(address, { target: { value: '10.0.1.24' } });
    expect(screen.getByTestId('enrollment-next')).toBeEnabled();
    fireEvent.change(address, { target: { value: '2001:db8::1' } });
    expect(screen.getByTestId('enrollment-next')).toBeEnabled();
    fireEvent.change(address, { target: { value: 'web.example.com' } });
    expect(screen.getByTestId('enrollment-next')).toBeEnabled();
    fireEvent.change(address, { target: { value: '-bad' } });
    expect(screen.getByTestId('enrollment-next')).toBeDisabled();
  });

  it('keeps step 1 values after returning from step 2', async () => {
    renderWizard();
    await fillBasics();
    fireEvent.click(screen.getByTestId('enrollment-next'));
    expect(screen.getByTestId('wizard-nav-3')).toBeDisabled();
    fireEvent.click(screen.getByTestId('wizard-back'));
    expect(screen.getByTestId('server-name')).toHaveValue('edge-01');
    expect(screen.getByTestId('server-address')).toHaveValue('192.0.2.10');
  });

  it('does not create a server before the review step', async () => {
    renderWizard();
    await fillBasics();
    fireEvent.click(screen.getByTestId('enrollment-next'));
    await passConnection();
    fireEvent.click(screen.getByTestId('enrollment-next'));
    expect(createServerMock).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('enrollment-next'));
    expect(createServerMock).not.toHaveBeenCalled();
  });

  it('blocks continue on step 2 until the local connection check succeeds', async () => {
    renderWizard();
    await fillBasics();
    fireEvent.click(screen.getByTestId('enrollment-next'));
    expect(screen.getByTestId('enrollment-next')).toBeDisabled();
    fireEvent.change(screen.getByTestId('ssh-port'), { target: { value: '70000' } });
    fireEvent.click(screen.getByTestId('check-connection'));
    expect(await screen.findByText(en.servers.create.sshPortInvalid)).toBeInTheDocument();
    fireEvent.change(screen.getByTestId('ssh-port'), { target: { value: '22' } });
    await passConnection();
    expect(screen.getByTestId('enrollment-next')).toBeEnabled();
  });

  it('creates a server once from review, hides the token, and does not persist it', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    renderWizard();
    await submitWizard({ manual: true });
    expect(await screen.findByTestId('enrollment-token-panel')).toBeInTheDocument();
    expect(screen.queryByTestId('enrollment-token')).not.toBeInTheDocument();
    expect(screen.getByTestId('enroll-command')).toHaveTextContent(
      'linuxpilot-agent enroll --stdin',
    );
    expect(screen.getByTestId('enroll-command')).not.toHaveTextContent('one-time-token');
    expect(createServerMock).toHaveBeenCalledTimes(1);
    expect(window.localStorage.getItem('enrollment-token')).toBeNull();
    expect(window.sessionStorage.getItem('enrollment-token')).toBeNull();
    expect(window.location.href).not.toMatch(/token=/);
    expect(log.mock.calls.flat().join(' ')).not.toContain('one-time-token');
    expect(info.mock.calls.flat().join(' ')).not.toContain('one-time-token');
    log.mockRestore();
    info.mockRestore();
  });

  it('copies the full working command while keeping the token hidden', async () => {
    renderWizard();
    await submitWizard({ manual: true });
    await screen.findByTestId('enrollment-token-panel');
    fireEvent.click(screen.getByTestId('copy-command'));
    await waitFor(() =>
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        "printf '%s\\n' 'one-time-token' | linuxpilot-agent enroll --stdin",
      ),
    );
    expect(screen.getByTestId('enroll-command')).not.toHaveTextContent('one-time-token');
  });

  it('lets the operator finish without waiting for the agent', async () => {
    const onClose = vi.fn();
    renderWizard({ onClose });
    await submitWizard();
    expect(await screen.findByTestId('enrollment-skip')).toHaveTextContent(
      en.servers.create.addLater,
    );
    fireEvent.click(screen.getByTestId('enrollment-skip'));
    expect(onClose).toHaveBeenCalled();
    expect(createServerMock).toHaveBeenCalledTimes(1);
    expect(await screen.findByText('Servers list')).toBeInTheDocument();
  });

  it('shows success after the backend confirms the agent', async () => {
    getServerMock.mockResolvedValue({
      id: 'srv-1',
      name: 'edge-01',
      status: 'ONLINE',
      agentStatus: 'CONNECTED',
      lastSeenAt: '2026-08-16T09:00:00.000Z',
      cpuUsagePercent: 12,
      agentVersion: '1.8.2',
    });
    renderWizard();
    await submitWizard();
    expect(await screen.findByTestId('server-creation-result')).toBeInTheDocument();
    expect(screen.getByText(en.servers.create.successTitle)).toBeInTheDocument();
  });

  it('asks before creating a new token and ignores a second click while busy', async () => {
    let resolveToken: (value: {
      serverId: string;
      token: string;
      expiresAt: string;
      installCommand: string;
      enrollCommand: string;
    }) => void = () => undefined;
    createEnrollmentTokenMock.mockImplementationOnce(() =>
      Promise.resolve({
        serverId: 'srv-1',
        token: 'one-time-token',
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
        installCommand: 'linuxpilot-agent install --user linuxpilot',
        enrollCommand: 'linuxpilot-agent enroll --stdin',
      }),
    );
    createEnrollmentTokenMock.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveToken = resolve;
        }),
    );
    renderWizard();
    await submitWizard({ manual: true });
    await screen.findByTestId('enrollment-token-panel');
    expect(createEnrollmentTokenMock).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByTestId('regenerate-token'));
    expect(await screen.findByTestId('regenerate-token-dialog')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('confirm-regenerate-token'));
    fireEvent.click(screen.getByTestId('regenerate-token'));
    expect(createEnrollmentTokenMock).toHaveBeenCalledTimes(2);
    resolveToken({
      serverId: 'srv-1',
      token: 'second-token',
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      installCommand: 'linuxpilot-agent install --user linuxpilot',
      enrollCommand: 'linuxpilot-agent enroll --stdin',
    });
    await waitFor(() =>
      expect(screen.queryByTestId('regenerate-token-dialog')).not.toBeInTheDocument(),
    );
    expect(await screen.findByTestId('token-created')).toHaveTextContent(
      en.servers.create.tokenCreated,
    );
  });

  it('lets the user pick a space and tags without an environment field', async () => {
    renderWizard();
    fireEvent.change(await screen.findByTestId('server-name'), { target: { value: 'edge-01' } });
    fireEvent.change(screen.getByTestId('server-address'), { target: { value: '10.0.1.24' } });
    expect(screen.queryByTestId('server-environment')).not.toBeInTheDocument();
    fireEvent.click(await screen.findByTestId('space-select'));
    fireEvent.click(screen.getByTestId('space-option-grp-1'));
    fireEvent.change(screen.getByTestId('tag-input'), { target: { value: 'edge' } });
    fireEvent.keyDown(screen.getByTestId('tag-input'), { key: 'Enter' });
    fireEvent.click(screen.getByTestId('enrollment-next'));
    await passConnection();
    fireEvent.click(screen.getByTestId('enrollment-next'));
    fireEvent.click(screen.getByTestId('enrollment-next'));
    expect(screen.getByText(en.servers.create.space)).toBeInTheDocument();
    expect(screen.getByText('Production')).toBeInTheDocument();
    expect(screen.queryByText(en.servers.create.environmentLabel)).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('confirm-add'));
    fireEvent.click(screen.getByTestId('create-server'));
    await waitFor(() => expect(createServerMock).toHaveBeenCalled());
    expect(createServerMock).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'edge-01',
        spaceId: 'grp-1',
        tags: ['edge'],
        primaryIp: '10.0.1.24',
        autoDetectSystem: true,
      }),
    );
  });

  it('requires an explicit confirmation before adding without an agent', async () => {
    renderWizard();
    await fillBasics();
    fireEvent.click(screen.getByTestId('enrollment-next'));
    await passConnection();
    fireEvent.click(screen.getByTestId('enrollment-next'));
    fireEvent.click(screen.getByTestId('install-mode-none'));
    expect(screen.getByTestId('enrollment-next')).toBeDisabled();
    fireEvent.click(screen.getByTestId('confirm-no-agent'));
    expect(screen.getByTestId('enrollment-next')).toBeEnabled();
    fireEvent.click(screen.getByTestId('enrollment-next'));
    fireEvent.click(screen.getByTestId('confirm-add'));
    fireEvent.click(screen.getByTestId('create-server'));
    await waitFor(() => expect(createServerMock).toHaveBeenCalled());
    expect(createEnrollmentTokenMock).not.toHaveBeenCalled();
    expect(await screen.findByTestId('server-creation-result')).toHaveTextContent(
      en.servers.create.partialNone,
    );
  });

  it('warns on unsaved close and restores focus to the opener', async () => {
    render(
      <LocaleProvider>
        <MemoryRouter>
          <AuthProvider>
            <Host />
          </AuthProvider>
        </MemoryRouter>
      </LocaleProvider>,
    );
    const opener = await screen.findByTestId('opener');
    opener.focus();
    fireEvent.click(opener);
    fireEvent.change(await screen.findByTestId('server-name'), { target: { value: 'edge-01' } });
    fireEvent.click(screen.getByTestId('wizard-close'));
    expect(await screen.findByText(en.servers.create.unsavedTitle)).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('confirm-close-wizard'));
    await waitFor(() => expect(screen.queryByTestId('enrollment-wizard')).not.toBeInTheDocument());
    await waitFor(() => expect(opener).toHaveFocus());
  });

  it('closes immediately when nothing changed and ignores overlay clicks after edits', async () => {
    const onClose = vi.fn();
    renderWizard({ onClose });
    await screen.findByTestId('enrollment-wizard');
    fireEvent.click(screen.getByTestId('wizard-close'));
    expect(onClose).toHaveBeenCalled();
    onClose.mockClear();
    renderWizard({ onClose });
    fireEvent.change(await screen.findByTestId('server-name'), { target: { value: 'edge-01' } });
    fireEvent.click(document.querySelector('[aria-label]') as HTMLElement);
    expect(screen.queryByText(en.servers.create.unsavedTitle)).not.toBeInTheDocument();
  });

  it('keeps entered data after an API error and blocks double submit', async () => {
    let resolveCreate: (value: { id: string; name: string; status: string }) => void = () =>
      undefined;
    createServerMock.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveCreate = resolve;
        }),
    );
    renderWizard();
    await goToReview();
    fireEvent.click(screen.getByTestId('confirm-add'));
    fireEvent.click(screen.getByTestId('create-server'));
    fireEvent.submit(document.getElementById('enrollment-wizard-form')!);
    expect(createServerMock).toHaveBeenCalledTimes(1);
    resolveCreate({ id: 'srv-1', name: 'edge-01', status: 'PENDING' });
    await screen.findByTestId('server-creation-progress');
  });

  it('shows a generic API error without internals', async () => {
    createServerMock.mockRejectedValueOnce(new ApiRequestError(500, 'INTERNAL_ERROR', 'stack'));
    renderWizard();
    await submitWizard();
    expect(await screen.findByText(en.servers.create.genericError)).toBeInTheDocument();
    expect(screen.queryByText('stack')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('retry-create'));
    fireEvent.click(screen.getByTestId('edit-step-1'));
    expect(screen.getByTestId('server-name')).toHaveValue('edge-01');
  });

  it('traps focus inside the dialog', async () => {
    renderWizard();
    const dialog = await screen.findByRole('dialog');
    const focusable = within(dialog)
      .getAllByRole('button')
      .concat(within(dialog).getAllByRole('textbox'));
    const last = focusable[focusable.length - 1];
    last?.focus();
    fireEvent.keyDown(dialog, { key: 'Tab' });
    expect(dialog.contains(document.activeElement)).toBe(true);
  });

  it('localizes the wizard into Ukrainian', async () => {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, 'uk');
    renderWizard();
    expect(await screen.findByText(uk.servers.create.title)).toBeInTheDocument();
    expect(screen.getByText(uk.servers.create.subtitle)).toBeInTheDocument();
    expect(screen.getByText(uk.servers.create.stepBasics)).toBeInTheDocument();
  });

  it('shows a compact spaces error and retries without blocking tags', async () => {
    listServerGroupsMock.mockRejectedValueOnce(new Error('offline'));
    renderWizard();
    expect(await screen.findByTestId('spaces-load-error')).toHaveTextContent(
      en.servers.create.spacesError,
    );
    fireEvent.change(screen.getByTestId('tag-input'), { target: { value: 'edge' } });
    fireEvent.keyDown(screen.getByTestId('tag-input'), { key: 'Enter' });
    expect(screen.getByTestId('tag-chip-edge')).toBeInTheDocument();
    listServerGroupsMock.mockResolvedValueOnce({
      items: [{ id: 'grp-1', name: 'Production', tags: ['prod'] }],
    });
    fireEvent.click(screen.getByTestId('retry-spaces'));
    await waitFor(() => expect(screen.queryByTestId('spaces-load-error')).not.toBeInTheDocument());
  });

  it('creates a space from step 1 and keeps wizard data', async () => {
    createServerGroupMock.mockResolvedValue({ id: 'grp-2', name: 'Staging' });
    listServerGroupsMock
      .mockResolvedValueOnce({ items: [{ id: 'grp-1', name: 'Production', tags: ['prod'] }] })
      .mockResolvedValue({
        items: [
          { id: 'grp-1', name: 'Production', tags: ['prod'] },
          { id: 'grp-2', name: 'Staging', tags: [] },
        ],
      });
    renderWizard();
    await fillBasics();
    fireEvent.change(await screen.findByTestId('tag-input'), { target: { value: 'web' } });
    fireEvent.keyDown(screen.getByTestId('tag-input'), { key: 'Enter' });
    fireEvent.click(screen.getByTestId('create-space-from-wizard'));
    expect(await screen.findByTestId('create-group-dialog')).toBeInTheDocument();
    fireEvent.change(screen.getByTestId('group-name'), { target: { value: 'Staging' } });
    fireEvent.click(screen.getByTestId('create-group-submit'));
    await waitFor(() =>
      expect(screen.queryByTestId('create-group-dialog')).not.toBeInTheDocument(),
    );
    expect(createServerGroupMock).toHaveBeenCalled();
    await waitFor(() => expect(screen.getByTestId('space-select')).toHaveTextContent('Staging'));
    expect(screen.getByTestId('tag-chip-web')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('enrollment-next'));
    fireEvent.click(screen.getByTestId('wizard-back'));
    expect(screen.getByTestId('server-name')).toHaveValue('edge-01');
    expect(screen.getByTestId('tag-chip-web')).toBeInTheDocument();
  });

  it('keeps an empty space selection as no spaceId', async () => {
    renderWizard();
    await fillBasics();
    fireEvent.click(await screen.findByTestId('space-select'));
    fireEvent.click(screen.getByTestId('space-option-none'));
    fireEvent.click(screen.getByTestId('enrollment-next'));
    await passConnection();
    fireEvent.click(screen.getByTestId('enrollment-next'));
    fireEvent.click(screen.getByTestId('enrollment-next'));
    fireEvent.click(screen.getByTestId('confirm-add'));
    fireEvent.click(screen.getByTestId('create-server'));
    await waitFor(() => expect(createServerMock).toHaveBeenCalled());
    expect(createServerMock).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'edge-01',
        spaceId: undefined,
        tags: [],
      }),
    );
  });
});
