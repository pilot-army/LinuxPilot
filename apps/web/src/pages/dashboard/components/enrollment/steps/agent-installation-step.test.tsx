import type { ComponentProps } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resources } from '@linuxpilot/i18n';
import {
  TOKEN_MASK,
  TOKEN_REVEAL_MS,
  buildEnrollCommand,
} from '../../../../../features/enrollment/command';
import { emptyForm } from '../../../../../features/enrollment/types';
import { LocaleProvider, LOCALE_STORAGE_KEY } from '../../../../../i18n';
import { AgentInstallationStep } from './agent-installation-step';

const en = resources.en;
const enrollCommand =
  'linuxpilot-agent enroll --gateway https://panel.example --server-id srv-1 --stdin';
const token = 'one-time-token';

function renderStep(overrides: Partial<ComponentProps<typeof AgentInstallationStep>> = {}) {
  const props = {
    form: { ...emptyForm(), name: '534534' },
    secret: {
      token,
      enrollCommand,
      installCommand: 'linuxpilot-agent install --user linuxpilot',
      expiresAt: new Date(Date.now() + 14 * 60_000).toISOString(),
    },
    busy: false,
    tokenCreated: false,
    connectionOutcome: 'waiting' as const,
    agentNotReady: false,
    onRequestRegenerate: vi.fn(),
    onRetryCheck: vi.fn(),
    ...overrides,
  };
  render(
    <LocaleProvider>
      <AgentInstallationStep {...props} />
    </LocaleProvider>,
  );
  return props;
}

describe('AgentInstallationStep', () => {
  beforeEach(() => {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, 'en');
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
  });

  it('builds the visible command from the real enroll command and hides the token', () => {
    renderStep();
    const visible = screen.getByTestId('enroll-command');
    expect(visible).toHaveTextContent(enrollCommand);
    expect(visible).toHaveTextContent(TOKEN_MASK);
    expect(visible).not.toHaveTextContent(token);
    expect(screen.queryByTestId('enrollment-token')).not.toBeInTheDocument();
  });

  it('reveals and then hides the token again', () => {
    renderStep();
    fireEvent.click(screen.getByTestId('toggle-token'));
    expect(screen.getByTestId('toggle-token')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('enroll-command')).toHaveTextContent(token);
    fireEvent.click(screen.getByTestId('toggle-token'));
    expect(screen.getByTestId('toggle-token')).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('enroll-command')).not.toHaveTextContent(token);
  });

  it('hides a revealed token after the timeout and when the tab is hidden', () => {
    vi.useFakeTimers();
    renderStep();
    fireEvent.click(screen.getByTestId('toggle-token'));
    expect(screen.getByTestId('enroll-command')).toHaveTextContent(token);
    act(() => {
      vi.advanceTimersByTime(TOKEN_REVEAL_MS);
    });
    expect(screen.getByTestId('enroll-command')).not.toHaveTextContent(token);

    fireEvent.click(screen.getByTestId('toggle-token'));
    act(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, value: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(screen.getByTestId('enroll-command')).not.toHaveTextContent(token);
    vi.useRealTimers();
  });

  it('copies the full command while keeping the token hidden on screen', async () => {
    renderStep();
    fireEvent.click(screen.getByTestId('copy-command'));
    await act(async () => {
      await Promise.resolve();
    });
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      buildEnrollCommand(enrollCommand, token),
    );
    expect(screen.getByTestId('enroll-command')).not.toHaveTextContent(token);
    expect(screen.getAllByText(en.servers.create.copied).length).toBeGreaterThan(0);
  });

  it('handles a Clipboard API failure', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
    });
    renderStep();
    fireEvent.click(screen.getByTestId('copy-command'));
    await act(async () => {
      await Promise.resolve();
    });
    expect(screen.getAllByText(en.servers.create.copyCommandFailed).length).toBeGreaterThan(0);
    expect(screen.getByTestId('enroll-command')).not.toHaveTextContent(token);
  });

  it('formats the remaining time from backend expiresAt', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-16T12:00:00.000Z'));
    renderStep({
      secret: {
        token,
        enrollCommand,
        installCommand: 'install',
        expiresAt: '2026-08-16T12:14:00.000Z',
      },
    });
    expect(screen.getByTestId('token-ttl')).toHaveTextContent('Token valid for 14 min');
    vi.useRealTimers();
  });

  it('shows an expired token state', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-16T12:00:00.000Z'));
    renderStep({
      secret: {
        token,
        enrollCommand,
        installCommand: 'install',
        expiresAt: '2026-08-16T11:59:00.000Z',
      },
    });
    expect(screen.getByTestId('token-ttl')).toHaveTextContent(en.servers.create.tokenExpired);
    expect(screen.getByTestId('agent-wait-status')).toHaveTextContent(
      en.servers.create.tokenExpiredLong,
    );
    expect(screen.getByTestId('enroll-command')).not.toHaveTextContent(token);
    vi.useRealTimers();
  });

  it('keeps the command inside a horizontally scrollable block', () => {
    renderStep();
    expect(screen.getByTestId('enroll-command').className).toBe('');
    expect(screen.getByTestId('enroll-command').parentElement?.className).toMatch(/command/);
  });
});
