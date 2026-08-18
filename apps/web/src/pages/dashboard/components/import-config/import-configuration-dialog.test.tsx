import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resources } from '@linuxpilot/i18n';
import { AuthProvider } from '../../../../auth/AuthProvider';
import { ProtectedRoute } from '../../../../auth/ProtectedRoute';
import { LocaleProvider, LOCALE_STORAGE_KEY } from '../../../../i18n';
import { testUser } from '../../../../test/auth-fixtures';
import { ImportConfigurationDialog } from './import-configuration-dialog';

const en = resources.en;

const {
  fetchCurrentUserMock,
  createServerMock,
  updateServerMock,
  listServersMock,
  listServerGroupsMock,
} = vi.hoisted(() => ({
  fetchCurrentUserMock: vi.fn(),
  createServerMock: vi.fn(),
  updateServerMock: vi.fn(),
  listServersMock: vi.fn(),
  listServerGroupsMock: vi.fn(),
}));

vi.mock('../../../../api/auth', () => ({
  login: vi.fn(),
  fetchCurrentUser: fetchCurrentUserMock,
  logout: vi.fn(),
}));

vi.mock('../../../../api/servers', () => ({
  createServer: createServerMock,
  updateServer: updateServerMock,
  listServers: listServersMock,
  listServerGroups: listServerGroupsMock,
}));

const operator = {
  ...testUser,
  permissions: ['servers.view', 'servers.create'],
};

const validYaml = `version: 1
servers:
  - name: web-01
    host: 192.0.2.10
    group: production
`;

function renderDialog(onClose = vi.fn(), onImported = vi.fn()) {
  return render(
    <LocaleProvider>
      <MemoryRouter initialEntries={['/dashboard']}>
        <AuthProvider>
          <Routes>
            <Route element={<ProtectedRoute />}>
              <Route
                path="/dashboard"
                element={
                  <ImportConfigurationDialog open onClose={onClose} onImported={onImported} />
                }
              />
              <Route path="/servers" element={<div>Servers page</div>} />
            </Route>
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    </LocaleProvider>,
  );
}

function upload(content: string, name = 'servers.yaml', type = 'text/plain') {
  const input = screen.getByTestId('import-file-input') as HTMLInputElement;
  const file = new File([content], name, { type });
  if (typeof file.text !== 'function') {
    Object.defineProperty(file, 'text', {
      value: () => Promise.resolve(content),
    });
  }
  Object.defineProperty(input, 'files', {
    configurable: true,
    value: [file],
  });
  fireEvent.change(input);
  return file;
}

describe('ImportConfigurationDialog', () => {
  beforeEach(() => {
    fetchCurrentUserMock.mockReset();
    createServerMock.mockReset();
    updateServerMock.mockReset();
    listServersMock.mockReset();
    listServerGroupsMock.mockReset();
    fetchCurrentUserMock.mockResolvedValue({ user: operator });
    listServersMock.mockResolvedValue({ items: [], page: 1, pageSize: 100, total: 0 });
    listServerGroupsMock.mockResolvedValue({ items: [], ungroupedCount: 0 });
    createServerMock.mockResolvedValue({ id: 'srv-1', name: 'web-01' });
    window.localStorage.setItem(LOCALE_STORAGE_KEY, 'en');
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
  });

  it('keeps continue disabled until a valid file is parsed and does not import yet', async () => {
    renderDialog();
    expect(
      await screen.findByRole('dialog', { name: en.dashboard.importConfig.title }),
    ).toBeInTheDocument();
    expect(screen.getByTestId('import-continue')).toBeDisabled();
    upload('servers: [', 'servers.yaml', 'text/plain');
    expect(await screen.findByTestId('import-error')).toHaveTextContent(
      en.dashboard.importConfig.errors.yamlParse,
    );
    expect(createServerMock).not.toHaveBeenCalled();
    upload(validYaml);
    expect(await screen.findByTestId('import-file-summary')).toBeInTheDocument();
    expect(screen.getByTestId('import-continue')).toBeEnabled();
    expect(createServerMock).not.toHaveBeenCalled();
  });

  it('rejects an unsupported extension', async () => {
    renderDialog();
    await screen.findByTestId('import-config-dialog');
    upload('name: x', 'servers.txt', 'text/plain');
    expect(await screen.findByTestId('import-error')).toHaveTextContent(
      en.dashboard.importConfig.errors.unsupportedFormat,
    );
  });

  it('previews servers then imports after confirm', async () => {
    const onImported = vi.fn();
    renderDialog(vi.fn(), onImported);
    await screen.findByTestId('import-config-dialog');
    upload(validYaml);
    await screen.findByTestId('import-file-summary');
    fireEvent.click(screen.getByTestId('import-continue'));
    expect(await screen.findByTestId('import-summary')).toBeInTheDocument();
    expect(createServerMock).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('import-submit'));
    await waitFor(() => expect(createServerMock).toHaveBeenCalledTimes(1));
    expect(createServerMock.mock.calls[0]?.[0]).toMatchObject({
      name: 'web-01',
      primaryIp: '192.0.2.10',
    });
    expect(createServerMock.mock.calls[0]?.[0]).not.toHaveProperty('password');
    expect(await screen.findByTestId('import-result')).toHaveTextContent(
      en.dashboard.importConfig.resultTitle,
    );
    expect(onImported).toHaveBeenCalled();
  });

  it('asks before closing unsaved work with Escape', async () => {
    const onClose = vi.fn();
    renderDialog(onClose);
    await screen.findByTestId('import-config-dialog');
    upload(validYaml);
    await screen.findByTestId('import-file-summary');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(await screen.findByTestId('import-unsaved')).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('import-unsaved-confirm'));
    expect(onClose).toHaveBeenCalled();
  });

  it('parses pasted JSON without storing it in localStorage', async () => {
    renderDialog();
    await screen.findByTestId('import-config-dialog');
    fireEvent.click(screen.getByTestId('import-tab-paste'));
    fireEvent.change(screen.getByTestId('import-paste'), {
      target: {
        value: JSON.stringify({
          version: 1,
          servers: [{ name: 'api-01', host: '192.0.2.20' }],
        }),
      },
    });
    await waitFor(() => expect(screen.getByTestId('import-continue')).toBeEnabled());
    expect(window.localStorage.getItem('import-config')).toBeNull();
  });
});
