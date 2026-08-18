import type { ComponentProps } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { resources } from '@linuxpilot/i18n';
import type { ServerSpace } from '@linuxpilot/server-contracts';
import { emptyForm } from '../../../../../features/enrollment/types';
import { LocaleProvider, LOCALE_STORAGE_KEY } from '../../../../../i18n';
import { GroupAndTagsStep, WIZARD_TAG_LIMIT } from './group-and-tags-step';

const en = resources.en;

vi.mock('../../../../../auth/use-permission', () => ({
  usePermission: () => true,
}));

const space: ServerSpace = {
  id: 'grp-1',
  name: 'Production',
  description: '',
  color: '#3b82f6',
  tags: ['prod'],
  notificationsEnabled: true,
  version: 1,
  createdAt: '2026-08-16T08:00:00.000Z',
  updatedAt: '2026-08-16T09:00:00.000Z',
  serverCount: 1,
  onlineCount: 1,
  offlineCount: 0,
  warningCount: 0,
  withoutAgentCount: 0,
  averageCpuPercent: null,
  averageMemoryPercent: null,
  averageDiskPercent: null,
  memberNames: [],
};

function renderStep(overrides: Partial<ComponentProps<typeof GroupAndTagsStep>> = {}) {
  const props = {
    form: emptyForm(),
    errors: {},
    spaces: [space],
    spacesStatus: 'success' as const,
    onChange: vi.fn(),
    onTagError: vi.fn(),
    onCreatedSpace: vi.fn(),
    onRetrySpaces: vi.fn(),
    ...overrides,
  };
  render(
    <LocaleProvider>
      <GroupAndTagsStep {...props} />
    </LocaleProvider>,
  );
  return props;
}

describe('GroupAndTagsStep', () => {
  beforeEach(() => {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, 'en');
  });

  it('shows the optional space row and an empty tag counter', () => {
    renderStep();
    expect(screen.getByText(en.servers.create.space)).toBeInTheDocument();
    expect(screen.getAllByText(en.servers.create.optionalBadge)).toHaveLength(2);
    expect(screen.getByTestId('space-select')).toHaveTextContent(
      en.servers.create.spacePlaceholder,
    );
    expect(screen.getByTestId('tag-counter')).toHaveTextContent(`0 / ${WIZARD_TAG_LIMIT}`);
    expect(screen.queryByText(/Popular|Популярні/i)).not.toBeInTheDocument();
  });

  it('selects a space and can return to no space', () => {
    const props = renderStep();
    fireEvent.click(screen.getByTestId('space-select'));
    fireEvent.click(screen.getByTestId('space-option-grp-1'));
    expect(props.onChange).toHaveBeenCalledWith('spaceId', 'grp-1');
    fireEvent.click(screen.getByTestId('space-select'));
    fireEvent.click(screen.getByTestId('space-option-none'));
    expect(props.onChange).toHaveBeenCalledWith('spaceId', '');
  });

  it('shows empty spaces without blocking the select', () => {
    renderStep({ spaces: [], spacesStatus: 'success' });
    fireEvent.click(screen.getByTestId('space-select'));
    expect(screen.getByText(en.servers.create.spacesEmpty)).toBeInTheDocument();
    expect(screen.getByTestId('space-option-none')).toBeInTheDocument();
  });

  it('disables the select while spaces are loading', () => {
    renderStep({ spacesStatus: 'loading', spaces: [] });
    expect(screen.getByTestId('space-select')).toBeDisabled();
    expect(screen.getByTestId('space-select')).toHaveTextContent(en.servers.create.spacesLoading);
    expect(screen.queryByTestId('spaces-load-error')).not.toBeInTheDocument();
  });

  it('keeps tags editable while a spaces error is visible', () => {
    const props = renderStep({ spacesStatus: 'error', spaces: [] });
    expect(screen.getByTestId('spaces-load-error')).toBeInTheDocument();
    fireEvent.change(screen.getByTestId('tag-input'), { target: { value: 'edge' } });
    fireEvent.keyDown(screen.getByTestId('tag-input'), { key: 'Enter' });
    expect(props.onChange).toHaveBeenCalledWith('tags', ['edge']);
  });

  it('protects retry from a second click while loading', async () => {
    let resolveRetry: () => void = () => undefined;
    const onRetrySpaces = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveRetry = resolve;
        }),
    );
    renderStep({ spacesStatus: 'error', spaces: [], onRetrySpaces });
    fireEvent.click(screen.getByTestId('retry-spaces'));
    fireEvent.click(screen.getByTestId('retry-spaces'));
    expect(onRetrySpaces).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('retry-spaces')).toBeDisabled();
    resolveRetry();
    await Promise.resolve();
  });

  it('adds a tag on Enter and comma, and keeps blur add', () => {
    const props = renderStep();
    const onChange = props.onChange as Mock;
    const input = screen.getByTestId('tag-input');
    fireEvent.change(input, { target: { value: 'web' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith('tags', ['web']);
    onChange.mockClear();
    fireEvent.change(input, { target: { value: 'kyiv' } });
    fireEvent.keyDown(input, { key: ',' });
    expect(onChange).toHaveBeenCalledWith('tags', ['kyiv']);
    onChange.mockClear();
    fireEvent.change(input, { target: { value: 'edge' } });
    fireEvent.blur(input);
    expect(onChange).toHaveBeenCalledWith('tags', ['edge']);
  });

  it('rejects empty, duplicate, and invalid tags', () => {
    const props = renderStep({ form: { ...emptyForm(), tags: ['web'] } });
    const input = screen.getByTestId('tag-input');
    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(props.onChange).not.toHaveBeenCalled();
    fireEvent.change(input, { target: { value: 'WEB' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(props.onTagError).toHaveBeenCalledWith(en.servers.create.tagDuplicate);
    fireEvent.change(input, { target: { value: 'bad tag!' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(props.onTagError).toHaveBeenCalledWith(en.servers.create.tagInvalid);
  });

  it('does not remove a tag with Backspace while the draft is not empty', () => {
    const props = renderStep({ form: { ...emptyForm(), tags: ['web'] } });
    const input = screen.getByTestId('tag-input');
    fireEvent.change(input, { target: { value: 'ab' } });
    fireEvent.keyDown(input, { key: 'Backspace' });
    expect(props.onChange).not.toHaveBeenCalled();
  });

  it('selects then removes the last tag with Backspace in an empty field', () => {
    const props = renderStep({ form: { ...emptyForm(), tags: ['web', 'kyiv'] } });
    const input = screen.getByTestId('tag-input');
    fireEvent.keyDown(input, { key: 'Backspace' });
    expect(props.onChange).not.toHaveBeenCalled();
    expect(screen.getByTestId('tag-chip-kyiv').className).toMatch(/Pending/);
    fireEvent.keyDown(input, { key: 'Backspace' });
    expect(props.onChange).toHaveBeenCalledWith('tags', ['web']);
  });

  it('removes a tag with the chip button', () => {
    const props = renderStep({ form: { ...emptyForm(), tags: ['web'] } });
    fireEvent.click(screen.getByLabelText('Remove tag web'));
    expect(props.onChange).toHaveBeenCalledWith('tags', []);
  });

  it('stops adding tags at the visible limit', () => {
    const tags = Array.from({ length: WIZARD_TAG_LIMIT }, (_, index) => `t${index}`);
    const props = renderStep({ form: { ...emptyForm(), tags } });
    expect(screen.getByTestId('tag-input')).toBeDisabled();
    expect(screen.getByTestId('tag-counter')).toHaveTextContent(
      `${WIZARD_TAG_LIMIT} / ${WIZARD_TAG_LIMIT}`,
    );
    fireEvent.keyDown(screen.getByTestId('tag-input'), { key: 'Enter' });
    expect(props.onChange).not.toHaveBeenCalled();
  });
});
