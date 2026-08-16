import { render, screen, waitFor, within } from '@testing-library/react';
import { fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AUTH_ERROR_CODES } from '@linuxpilot/auth-contracts';
import { resources } from '@linuxpilot/i18n';
import { ApiRequestError } from '../../api/client';
import { AuthProvider } from '../../auth/AuthProvider';
import { GuestRoute, ProtectedRoute } from '../../auth/ProtectedRoute';
import { REMEMBER_EMAIL_KEY } from '../../features/auth/remember-email';
import { LocaleProvider, LOCALE_STORAGE_KEY } from '../../i18n';
import { testUser } from '../../test/auth-fixtures';
import { AuthPage } from './auth-page';

const en = resources.en;
const uk = resources.uk;
const credentials = { email: 'admin@example.com', password: 'secret-pass' };

const { loginMock, fetchCurrentUserMock, logoutMock } = vi.hoisted(() => ({
  loginMock: vi.fn(),
  fetchCurrentUserMock: vi.fn(),
  logoutMock: vi.fn(),
}));

vi.mock('../../api/auth', () => ({
  login: loginMock,
  fetchCurrentUser: fetchCurrentUserMock,
  logout: logoutMock,
}));

function renderAt(path: string) {
  return render(
    <LocaleProvider>
      <MemoryRouter initialEntries={[path]}>
        <AuthProvider>
          <Routes>
            <Route element={<GuestRoute />}>
              <Route path="/login" element={<AuthPage />} />
            </Route>
            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<div>Dashboard ready</div>} />
            </Route>
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    </LocaleProvider>,
  );
}

async function renderLogin() {
  fetchCurrentUserMock.mockRejectedValue(
    new ApiRequestError(401, AUTH_ERROR_CODES.UNAUTHORIZED, 'no'),
  );
  renderAt('/login');
  return screen.findByRole('form', { name: en.auth.login.formLabel });
}

function fillValidForm() {
  fireEvent.change(screen.getByLabelText(en.auth.fields.email), {
    target: { value: credentials.email },
  });
  fireEvent.change(screen.getByLabelText(en.auth.fields.password), {
    target: { value: credentials.password },
  });
}

describe('AuthPage', () => {
  beforeEach(() => {
    loginMock.mockReset();
    fetchCurrentUserMock.mockReset();
    logoutMock.mockReset();
    window.localStorage.setItem(LOCALE_STORAGE_KEY, 'en');
    window.localStorage.removeItem(REMEMBER_EMAIL_KEY);
  });

  it('renders the sign-in card with accessible labels', async () => {
    await renderLogin();

    expect(
      screen.getByRole('heading', { hidden: true, level: 1, name: en.auth.hero.title }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: en.auth.login.title }),
    ).toBeInTheDocument();
    expect(screen.getByText(en.auth.hero.description, { selector: 'p' })).toBeInTheDocument();
    expect(screen.getByText(en.auth.status.label)).toBeInTheDocument();
    const terminal = screen.getByText('linuxpilot@server: ~').closest('[aria-hidden="true"]');
    expect(terminal).toHaveTextContent('$ linuxpilot status');
    expect(terminal).toHaveTextContent('nginx');
    expect(terminal).toHaveTextContent('docker');
    expect(terminal).toHaveTextContent('firewall');
    expect(terminal).toHaveTextContent('active');
    expect(terminal).toHaveTextContent('protected');
    expect(screen.queryByText('12 servers')).not.toBeInTheDocument();
    expect(screen.queryByText('3.2 TB traffic')).not.toBeInTheDocument();
    expect(screen.queryByText('24/7 monitoring')).not.toBeInTheDocument();
    expect(screen.getByText(en.common.brand.name)).toBeInTheDocument();
    expect(screen.getByLabelText(en.auth.fields.email)).toHaveAttribute('autocomplete', 'email');
    expect(screen.getByLabelText(en.auth.fields.email)).toHaveAttribute(
      'placeholder',
      en.auth.login.emailPlaceholder,
    );
    expect(screen.getByLabelText(en.auth.fields.password)).toHaveAttribute(
      'autocomplete',
      'current-password',
    );
    expect(screen.getByRole('button', { name: en.auth.login.submit })).toBeEnabled();
    expect(screen.getByRole('button', { name: en.auth.login.passkey })).toBeDisabled();
    expect(screen.getByText(en.auth.login.passkeyUnavailable)).toBeInTheDocument();
    expect(screen.getByText(en.auth.login.encryption)).toBeInTheDocument();
    expect(screen.getByText(en.auth.login.rememberMe)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: en.auth.links.forgotPassword })).toBeInTheDocument();
  });

  it('validates required fields without calling the API', async () => {
    const form = await renderLogin();

    fireEvent.submit(form);

    expect(await screen.findByText(en.validation.login.emailRequired)).toBeInTheDocument();
    expect(screen.getByText(en.validation.login.passwordRequired)).toBeInTheDocument();
    expect(screen.getByLabelText(en.auth.fields.email)).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText(en.auth.fields.password)).toHaveAttribute('aria-invalid', 'true');
    expect(loginMock).not.toHaveBeenCalled();
  });

  it('rejects an invalid email without calling the API', async () => {
    const form = await renderLogin();

    fireEvent.change(screen.getByLabelText(en.auth.fields.email), { target: { value: 'pubsik' } });
    fireEvent.change(screen.getByLabelText(en.auth.fields.password), {
      target: { value: credentials.password },
    });
    fireEvent.submit(form);

    const email = screen.getByLabelText(en.auth.fields.email);
    expect(await screen.findByText(en.validation.login.emailInvalid)).toBeInTheDocument();
    expect(email).toHaveAttribute('aria-invalid', 'true');
    expect(email).toHaveValue('pubsik');
    expect(loginMock).not.toHaveBeenCalled();
  });

  it('validates email on blur and clears the error when the value is corrected', async () => {
    await renderLogin();
    const email = screen.getByLabelText(en.auth.fields.email);

    fireEvent.change(email, { target: { value: 'pubsik' } });
    fireEvent.blur(email);

    expect(await screen.findByText(en.validation.login.emailInvalid)).toBeInTheDocument();
    expect(email).toHaveAttribute('aria-invalid', 'true');
    expect(email).toHaveValue('pubsik');

    fireEvent.change(email, { target: { value: credentials.email } });
    expect(screen.queryByText(en.validation.login.emailInvalid)).not.toBeInTheDocument();
    expect(email).not.toHaveAttribute('aria-invalid', 'true');
    expect(email).toHaveValue(credentials.email);
  });

  it('toggles password visibility', async () => {
    await renderLogin();
    const password = screen.getByLabelText(en.auth.fields.password);
    const toggle = screen.getByRole('button', { name: en.auth.password.show });

    expect(password).toHaveAttribute('type', 'password');
    fireEvent.click(toggle);
    expect(password).toHaveAttribute('type', 'text');
    expect(screen.getByRole('button', { name: en.auth.password.hide })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    fireEvent.click(screen.getByRole('button', { name: en.auth.password.hide }));
    expect(password).toHaveAttribute('type', 'password');
  });

  it('shows a Caps Lock hint while the password field is focused', async () => {
    await renderLogin();
    const password = screen.getByLabelText(en.auth.fields.password);

    const originalGetModifierState = KeyboardEvent.prototype.getModifierState;
    KeyboardEvent.prototype.getModifierState = function (name: string) {
      return name === 'CapsLock';
    };
    try {
      fireEvent.keyDown(password, { key: 'A' });
      expect(screen.getByText(en.auth.password.capsLock)).toBeInTheDocument();
    } finally {
      KeyboardEvent.prototype.getModifierState = originalGetModifierState;
    }
    fireEvent.blur(password);
    expect(screen.queryByText(en.auth.password.capsLock)).not.toBeInTheDocument();
  });

  it('submits a valid form and navigates to the dashboard', async () => {
    await renderLogin();
    loginMock.mockResolvedValue({ user: testUser });

    fillValidForm();
    fireEvent.submit(screen.getByRole('form', { name: en.auth.login.formLabel }));

    expect(await screen.findByText('Dashboard ready')).toBeInTheDocument();
    expect(loginMock).toHaveBeenCalledWith({
      emailOrUsername: credentials.email,
      password: credentials.password,
    });
  });

  it('blocks a second submit while a request is in flight', async () => {
    await renderLogin();
    let resolveLogin: (value: { user: typeof testUser }) => void = () => undefined;
    loginMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveLogin = resolve;
        }),
    );

    fillValidForm();
    const form = screen.getByRole('form', { name: en.auth.login.formLabel });
    fireEvent.submit(form);
    fireEvent.submit(form);

    const submit = screen.getByRole('button', { name: en.auth.login.submitting });
    expect(submit).toBeDisabled();
    expect(submit).toHaveAttribute('aria-busy', 'true');
    expect(loginMock).toHaveBeenCalledTimes(1);

    resolveLogin({ user: testUser });
    expect(await screen.findByText('Dashboard ready')).toBeInTheDocument();
  });

  it('shows a mapped API error and keeps the email', async () => {
    await renderLogin();
    loginMock.mockRejectedValue(
      new ApiRequestError(401, AUTH_ERROR_CODES.INVALID_CREDENTIALS, 'Invalid credentials'),
    );

    fillValidForm();
    fireEvent.change(screen.getByLabelText(en.auth.fields.password), {
      target: { value: 'wrong' },
    });
    fireEvent.submit(screen.getByRole('form', { name: en.auth.login.formLabel }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(en.auth.errors.invalidCredentials);
    expect(alert).toHaveAttribute('aria-live', 'polite');
    expect(screen.getByLabelText(en.auth.fields.email)).toHaveValue(credentials.email);
    expect(screen.getByRole('button', { name: en.auth.login.submit })).toBeEnabled();
  });

  it('shows a localized Gateway error', async () => {
    await renderLogin();
    loginMock.mockRejectedValue(new ApiRequestError(503, 'GATEWAY_UNAVAILABLE', 'stack trace'));

    fillValidForm();
    fireEvent.submit(screen.getByRole('form', { name: en.auth.login.formLabel }));

    expect(await screen.findByRole('alert')).toHaveTextContent(en.auth.errors.gatewayUnavailable);
  });

  it('redirects an already authenticated user away from /login', async () => {
    fetchCurrentUserMock.mockResolvedValue({ user: testUser });
    renderAt('/login');

    expect(await screen.findByText('Dashboard ready')).toBeInTheDocument();
    expect(screen.queryByRole('form', { name: en.auth.login.formLabel })).not.toBeInTheDocument();
  });

  it('shows an expired-session notice when restore reports an expired session', async () => {
    fetchCurrentUserMock.mockRejectedValue(
      new ApiRequestError(401, AUTH_ERROR_CODES.SESSION_EXPIRED, 'Session has expired'),
    );
    renderAt('/login');

    expect(await screen.findByRole('alert')).toHaveTextContent(en.auth.errors.sessionExpired);
  });

  it('submits from the keyboard via the form', async () => {
    await renderLogin();
    loginMock.mockResolvedValue({ user: testUser });

    const email = screen.getByLabelText(en.auth.fields.email);
    fireEvent.change(email, { target: { value: credentials.email } });
    fireEvent.change(screen.getByLabelText(en.auth.fields.password), {
      target: { value: credentials.password },
    });
    fireEvent.submit(email.closest('form') as HTMLFormElement);

    expect(await screen.findByText('Dashboard ready')).toBeInTheDocument();
  });

  it('wires describedby attributes for field errors', async () => {
    const form = await renderLogin();
    fireEvent.submit(form);

    await screen.findByText(en.validation.login.emailRequired);
    const email = screen.getByLabelText(en.auth.fields.email);
    const describedBy = email.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    expect(document.getElementById(describedBy ?? '')).toHaveTextContent(
      en.validation.login.emailRequired,
    );
    expect(within(form).getByLabelText(en.auth.fields.password)).toHaveAttribute(
      'aria-describedby',
    );
  });

  it('keeps an anonymous user off a protected route', async () => {
    fetchCurrentUserMock.mockRejectedValue(
      new ApiRequestError(401, AUTH_ERROR_CODES.UNAUTHORIZED, 'no'),
    );
    renderAt('/dashboard');

    expect(await screen.findByRole('form', { name: en.auth.login.formLabel })).toBeInTheDocument();
    expect(screen.queryByText('Dashboard ready')).not.toBeInTheDocument();
  });

  it('waits for session restore before showing the form', async () => {
    let rejectUser: (reason: unknown) => void = () => undefined;
    fetchCurrentUserMock.mockImplementation(
      () =>
        new Promise((_, reject) => {
          rejectUser = reject;
        }),
    );
    renderAt('/login');

    expect(screen.getByText(en.auth.session.restoring)).toBeInTheDocument();
    rejectUser(new ApiRequestError(401, AUTH_ERROR_CODES.UNAUTHORIZED, 'no'));
    expect(await screen.findByRole('form', { name: en.auth.login.formLabel })).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.queryByText(en.auth.session.restoring)).not.toBeInTheDocument(),
    );
  });

  it('switches the login copy from English to Ukrainian without a reload', async () => {
    await renderLogin();

    fireEvent.click(screen.getByRole('button', { name: en.common.language.switcher }));
    fireEvent.click(screen.getByRole('option', { name: 'UA' }));

    expect(
      await screen.findByRole('heading', { level: 2, name: uk.auth.login.title }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { hidden: true, level: 1, name: uk.auth.hero.title }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(uk.auth.fields.email)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: uk.auth.login.submit })).toBeInTheDocument();
    expect(screen.getByText(uk.auth.status.label)).toBeInTheDocument();
    expect(document.documentElement.lang).toBe('uk');
    expect(window.localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('uk');
  });

  it('announces password recovery through a live region', async () => {
    await renderLogin();

    fireEvent.click(screen.getByRole('button', { name: en.auth.links.forgotPassword }));
    expect(screen.getByText(en.auth.login.recoveryHint)).toBeInTheDocument();
  });

  it('shows Passkey as unavailable and not actionable', async () => {
    await renderLogin();

    expect(screen.getByRole('button', { name: en.auth.login.passkey })).toBeDisabled();
    expect(screen.getByText(en.auth.login.passkeyUnavailable)).toBeInTheDocument();
  });

  it('persists the email when remember-me is checked', async () => {
    await renderLogin();
    loginMock.mockResolvedValue({ user: testUser });

    fillValidForm();
    fireEvent.click(screen.getByLabelText(en.auth.login.rememberMe));
    fireEvent.submit(screen.getByRole('form', { name: en.auth.login.formLabel }));

    expect(await screen.findByText('Dashboard ready')).toBeInTheDocument();
    expect(window.localStorage.getItem(REMEMBER_EMAIL_KEY)).toBe(credentials.email);

    const stored = Array.from({ length: window.localStorage.length }, (_, index) => {
      const key = window.localStorage.key(index) ?? '';
      return window.localStorage.getItem(key) ?? '';
    }).join('\n');
    expect(stored).not.toContain(credentials.password);
  });
});
