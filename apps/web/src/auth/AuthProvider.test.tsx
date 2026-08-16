import { render, screen, waitFor } from '@testing-library/react';
import { fireEvent } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AUTH_ERROR_CODES } from '@linuxpilot/auth-contracts';
import { resources } from '@linuxpilot/i18n';
import { ApiRequestError } from '../api/client';
import { testUser } from '../test/auth-fixtures';
import { AuthProvider, useAuth } from './AuthProvider';

const { fetchCurrentUserMock, logoutMock } = vi.hoisted(() => ({
  fetchCurrentUserMock: vi.fn(),
  logoutMock: vi.fn(),
}));

vi.mock('../api/auth', () => ({
  login: vi.fn(),
  fetchCurrentUser: fetchCurrentUserMock,
  logout: logoutMock,
}));

function Probe() {
  const { status, error, logout } = useAuth();
  return (
    <div>
      <p>{status}</p>
      <p>{error ?? 'none'}</p>
      <button type="button" onClick={() => void logout()}>
        out
      </button>
    </div>
  );
}

describe('AuthProvider logout', () => {
  beforeEach(() => {
    fetchCurrentUserMock.mockReset();
    logoutMock.mockReset();
    fetchCurrentUserMock.mockResolvedValue({ user: testUser });
  });

  it('clears the session after a successful logout', async () => {
    logoutMock.mockResolvedValue({ success: true });
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    await screen.findByText('authenticated');
    fireEvent.click(screen.getByText('out'));
    await waitFor(() => expect(screen.getByText('anonymous')).toBeInTheDocument());
    expect(screen.getByText('none')).toBeInTheDocument();
  });

  it('stays authenticated when CSRF blocks logout', async () => {
    logoutMock.mockRejectedValue(new ApiRequestError(403, AUTH_ERROR_CODES.CSRF_REJECTED, 'csrf'));
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    await screen.findByText('authenticated');
    fireEvent.click(screen.getByText('out'));
    await waitFor(() => expect(screen.getByText('csrfRejected')).toBeInTheDocument());
    expect(screen.getByText('authenticated')).toBeInTheDocument();
  });

  it('does not claim a complete server logout when revoke fails', async () => {
    logoutMock.mockRejectedValue(new ApiRequestError(502, AUTH_ERROR_CODES.INTERNAL_ERROR, 'down'));
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    await screen.findByText('authenticated');
    fireEvent.click(screen.getByText('out'));
    await waitFor(() => expect(screen.getByText('logoutIncomplete')).toBeInTheDocument());
    expect(screen.getByText('anonymous')).toBeInTheDocument();
    expect(resources.en.auth.errors.logoutIncomplete).toMatch(/may still be active/i);
  });
});
