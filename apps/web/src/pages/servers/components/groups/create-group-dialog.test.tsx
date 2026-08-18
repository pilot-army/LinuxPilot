import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resources } from '@linuxpilot/i18n';
import { LocaleProvider, LOCALE_STORAGE_KEY } from '../../../../i18n';
import { ApiRequestError } from '../../../../api/client';
import { CreateGroupDialog } from './create-group-dialog';

const en = resources.en;
const { createServerGroupMock } = vi.hoisted(() => ({
  createServerGroupMock: vi.fn(),
}));

vi.mock('../../../../api/servers', () => ({
  createServerGroup: createServerGroupMock,
}));

function renderDialog(props: Partial<Parameters<typeof CreateGroupDialog>[0]> = {}) {
  const onClose = props.onClose ?? vi.fn();
  const onCreated = props.onCreated ?? vi.fn();
  return {
    onClose,
    onCreated,
    ...render(
      <LocaleProvider>
        <CreateGroupDialog
          open
          existingNames={props.existingNames ?? ['Production']}
          existingSlugs={props.existingSlugs ?? ['production']}
          existingTags={props.existingTags ?? ['prod']}
          serverIds={props.serverIds}
          onClose={onClose}
          onCreated={onCreated}
        />
      </LocaleProvider>,
    ),
  };
}

describe('CreateGroupDialog', () => {
  beforeEach(() => {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, 'en');
    createServerGroupMock.mockReset();
    createServerGroupMock.mockResolvedValue({ id: 'space-1', name: 'Development' });
  });

  it('generates a slug, updates preview, and keeps a manual slug', async () => {
    renderDialog();
    fireEvent.change(screen.getByTestId('group-name'), { target: { value: 'Production Web' } });
    expect(screen.getByTestId('group-slug')).toHaveValue('production-web');
    expect(screen.getByTestId('space-preview')).toHaveTextContent('Production Web');
    fireEvent.click(screen.getByTestId('space-slug-unlock'));
    fireEvent.change(screen.getByTestId('group-slug'), { target: { value: 'prod-web' } });
    fireEvent.change(screen.getByTestId('group-name'), { target: { value: 'Development' } });
    expect(screen.getByTestId('group-slug')).toHaveValue('prod-web');
    fireEvent.click(screen.getByTestId('space-icon-database'));
    fireEvent.click(screen.getByTestId('space-color-red'));
    fireEvent.change(screen.getByTestId('group-tags'), { target: { value: 'dev' } });
    fireEvent.keyDown(screen.getByTestId('group-tags'), { key: 'Enter' });
    expect(screen.getByTestId('space-tag-dev')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('create-group-submit'));
    await waitFor(() =>
      expect(createServerGroupMock).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Development',
          slug: 'prod-web',
          icon: 'database',
          color: '#ef4444',
          tags: ['dev'],
        }),
      ),
    );
  });

  it('shows a field error when the slug is already used', async () => {
    renderDialog({ existingSlugs: ['development'] });
    fireEvent.change(screen.getByTestId('group-name'), { target: { value: 'Development' } });
    expect(screen.getByTestId('create-group-submit')).toBeDisabled();
    expect(screen.getByText(en.servers.groups.createDialog.slugTaken)).toBeInTheDocument();
  });

  it('keeps values after an API error', async () => {
    createServerGroupMock.mockRejectedValueOnce(new ApiRequestError(500, 'INTERNAL_ERROR', 'boom'));
    renderDialog();
    fireEvent.change(screen.getByTestId('group-name'), { target: { value: 'Edge' } });
    fireEvent.click(screen.getByTestId('create-group-submit'));
    expect(
      await screen.findByText(en.servers.groups.createDialog.createFailed),
    ).toBeInTheDocument();
    expect(screen.getByTestId('create-group-dialog')).toBeInTheDocument();
    expect(screen.getByTestId('group-name')).toHaveValue('Edge');
  });

  it('asks before closing a dirty form', () => {
    const { onClose } = renderDialog();
    fireEvent.change(screen.getByTestId('group-name'), { target: { value: 'Edge' } });
    fireEvent.click(screen.getAllByRole('button', { name: en.common.actions.close })[1]!);
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByText(en.servers.groups.createDialog.unsavedBody)).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('space-unsaved-confirm'));
    expect(onClose).toHaveBeenCalled();
  });

  it('includes selected serverIds in the create payload', async () => {
    renderDialog({ serverIds: ['s1', 's2'] });
    fireEvent.change(screen.getByTestId('group-name'), { target: { value: 'Web' } });
    expect(screen.getByTestId('space-preselected-servers')).toHaveTextContent('2');
    fireEvent.click(screen.getByTestId('create-group-submit'));
    await waitFor(() =>
      expect(createServerGroupMock).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Web',
          slug: 'web',
          serverIds: ['s1', 's2'],
        }),
      ),
    );
    const payload = createServerGroupMock.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(payload).not.toHaveProperty('environment');
    expect(payload).not.toHaveProperty('ownerId');
    expect(payload).not.toHaveProperty('teamId');
    expect(payload).not.toHaveProperty('permissions');
  });
});
