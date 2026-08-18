import type { ComponentProps } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resources } from '@linuxpilot/i18n';
import { emptyForm } from '../../../../../features/enrollment/types';
import { LocaleProvider, LOCALE_STORAGE_KEY } from '../../../../../i18n';
import { SystemSelectionStep } from './system-selection-step';

const en = resources.en;

function renderStep(overrides: Partial<ComponentProps<typeof SystemSelectionStep>> = {}) {
  const props = {
    form: emptyForm(),
    onChange: vi.fn(),
    ...overrides,
  };
  render(
    <LocaleProvider>
      <SystemSelectionStep {...props} />
    </LocaleProvider>,
  );
  return props;
}

describe('SystemSelectionStep', () => {
  beforeEach(() => {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, 'en');
  });

  it('enables automatic detection by default and disables manual fields', () => {
    renderStep();
    const toggle = screen.getByTestId('detect-automatically');
    expect(toggle).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByTestId('distro-ubuntu')).toBeDisabled();
    expect(screen.getByTestId('distro-debian')).toBeDisabled();
    expect(screen.getByTestId('arch-amd64')).toBeDisabled();
    expect(screen.getByTestId('arch-arm64')).toBeDisabled();
    expect(screen.getByTestId('os-version')).toBeDisabled();
    expect(screen.getByTestId('distro-ubuntu')).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('arch-amd64')).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getAllByText(en.servers.create.willDetectAutomatically).length).toBeGreaterThan(
      0,
    );
  });

  it('does not show Ubuntu or amd64 as selected while auto-detect is on', () => {
    renderStep({
      form: {
        ...emptyForm(),
        distribution: 'ubuntu',
        architecture: 'amd64',
        detectAutomatically: true,
      },
    });
    expect(screen.getByTestId('distro-ubuntu')).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('arch-amd64')).toHaveAttribute('aria-pressed', 'false');
  });

  it('enables manual fields when auto-detect is turned off', () => {
    const props = renderStep();
    fireEvent.click(screen.getByTestId('detect-automatically'));
    expect(props.onChange).toHaveBeenCalledWith('detectAutomatically', false);
  });

  it('restores previously chosen values when returning to manual mode', () => {
    renderStep({
      form: {
        ...emptyForm(),
        detectAutomatically: false,
        distribution: 'debian',
        osVersion: '12',
        architecture: 'arm64',
      },
    });
    expect(screen.getByTestId('distro-debian')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('arch-arm64')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('os-version')).toHaveValue('12');
    expect(screen.getByTestId('os-version')).toBeEnabled();
  });

  it('keeps architecture unselected in a fresh manual mode', () => {
    renderStep({ form: { ...emptyForm(), detectAutomatically: false } });
    expect(screen.getByTestId('arch-amd64')).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('arch-arm64')).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('distro-ubuntu')).toBeEnabled();
  });

  it('renders icons for auto-detect, distributions, and architectures', () => {
    renderStep();
    expect(screen.getByTestId('system-selection-step').querySelectorAll('svg')).toHaveLength(6);
    expect(screen.getByTestId('distro-ubuntu').querySelector('svg')).not.toBeNull();
    expect(screen.getByTestId('distro-debian').querySelector('svg')).not.toBeNull();
    expect(screen.getByTestId('distro-other').querySelector('svg')).not.toBeNull();
    expect(screen.getByTestId('arch-amd64').querySelector('svg')).not.toBeNull();
    expect(screen.getByTestId('arch-arm64').querySelector('svg')).not.toBeNull();
  });
});
