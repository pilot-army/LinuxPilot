import { type FormEvent, type KeyboardEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthProvider';
import { useI18n } from '../../i18n';
import { Button } from '../../shared/ui/button';
import { LanguageSwitcher } from '../../shared/ui/language-switcher';
import { TextField } from '../../shared/ui/text-field';
import { AuthError } from './auth-error';
import {
  hasLoginFieldErrors,
  validateLoginEmail,
  validateLoginForm,
  type LoginFieldErrors,
} from './login-validation';
import { PasskeyButton } from './passkey-button';
import { PasswordInput } from './password-input';
import { persistRememberedEmail, readRememberedEmail } from './remember-email';
import { submitLogin } from './submit-login';
import styles from './login-form.module.css';

function useCapsLock() {
  const [capsLockOn, setCapsLockOn] = useState(false);

  return {
    capsLockOn,
    onKeyEvent: (event: KeyboardEvent<HTMLInputElement>) => {
      const fromSynthetic = event.getModifierState('CapsLock');
      const fromNative = event.nativeEvent.getModifierState?.('CapsLock') ?? false;
      setCapsLockOn(fromSynthetic || fromNative);
    },
    onBlur: () => setCapsLockOn(false),
  };
}

export function LoginForm() {
  const { login, error } = useAuth();
  const { messages } = useI18n();
  const navigate = useNavigate();
  const capsLock = useCapsLock();
  const [email, setEmail] = useState(readRememberedEmail);
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(() => Boolean(readRememberedEmail()));
  const [fieldErrors, setFieldErrors] = useState<LoginFieldErrors>({});
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [succeeded, setSucceeded] = useState(false);

  const busy = submitting || succeeded;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) {
      return;
    }

    const nextErrors = validateLoginForm(email, password);
    setFieldErrors(nextErrors);
    setNotice(null);
    if (hasLoginFieldErrors(nextErrors)) {
      return;
    }

    setSubmitting(true);
    try {
      await submitLogin({ email, password, rememberMe }, login);
      persistRememberedEmail(email.trim(), rememberMe);
      setSucceeded(true);
      navigate('/dashboard', { replace: true });
    } catch {
      setSubmitting(false);
    }
  }

  return (
    <section className={styles.card} aria-labelledby="login-title">
      <header className={styles.heading}>
        <div className={styles.headingCopy}>
          <h2 id="login-title">{messages.auth.login.title}</h2>
          <p>{messages.auth.login.subtitle}</p>
        </div>
        <LanguageSwitcher />
      </header>

      <form
        className={styles.form}
        onSubmit={(event) => void onSubmit(event)}
        aria-label={messages.auth.login.formLabel}
        noValidate
      >
        <div className={styles.fields}>
          <TextField
            name="email"
            data-testid="login-email"
            type="email"
            label={messages.auth.fields.email}
            placeholder={messages.auth.login.emailPlaceholder}
            autoComplete="email"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            inputMode="email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              if (fieldErrors.email) {
                setFieldErrors((current) => ({ ...current, email: undefined }));
              }
            }}
            onBlur={() => {
              const emailError = validateLoginEmail(email);
              setFieldErrors((current) => ({ ...current, email: emailError }));
            }}
            error={fieldErrors.email ? messages.validation.login[fieldErrors.email] : undefined}
            disabled={busy}
            prefix={<MailIcon />}
          />
          <PasswordInput
            name="password"
            data-testid="login-password"
            label={messages.auth.fields.password}
            autoComplete="current-password"
            autoCapitalize="none"
            spellCheck={false}
            enterKeyHint="go"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              if (fieldErrors.password) {
                setFieldErrors((current) => ({ ...current, password: undefined }));
              }
            }}
            onKeyUp={capsLock.onKeyEvent}
            onKeyDown={capsLock.onKeyEvent}
            onBlur={capsLock.onBlur}
            error={
              fieldErrors.password ? messages.validation.login[fieldErrors.password] : undefined
            }
            hint={capsLock.capsLockOn ? messages.auth.password.capsLock : undefined}
            disabled={busy}
          />
        </div>

        <div className={styles.meta}>
          <button
            type="button"
            className={styles.forgot}
            disabled={busy}
            onClick={() => setNotice(messages.auth.login.recoveryHint)}
          >
            {messages.auth.links.forgotPassword}
          </button>
          <label className={styles.remember}>
            <input
              type="checkbox"
              checked={rememberMe}
              disabled={busy}
              onChange={(event) => setRememberMe(event.target.checked)}
            />
            <span>{messages.auth.login.rememberMe}</span>
          </label>
        </div>

        <AuthError message={error ? messages.auth.errors[error] : null} />
        <p className={notice ? styles.notice : 'sr-only'} aria-live="polite">
          {notice}
        </p>

        <Button
          type="submit"
          data-testid="login-submit"
          loading={submitting}
          disabled={busy}
          className={succeeded ? styles.success : undefined}
          aria-label={
            succeeded
              ? messages.auth.login.success
              : submitting
                ? messages.auth.login.submitting
                : messages.auth.login.submit
          }
        >
          {succeeded ? messages.auth.login.success : messages.auth.login.submit}
        </Button>

        <div className={styles.divider} role="separator" aria-label={messages.auth.login.or}>
          <span>{messages.auth.login.or}</span>
        </div>

        <PasskeyButton disabled={busy} />
      </form>

      <p className={styles.secure}>
        <ShieldIcon />
        {messages.auth.login.encryption}
      </p>
    </section>
  );
}

function MailIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true" focusable="false">
      <rect
        x="2.8"
        y="4.6"
        width="14.4"
        height="10.8"
        rx="1.8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="m3.6 6.2 6.4 4.4 6.4-4.4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg className={styles.secureIcon} viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path
        d="M8 1.8 3.4 3.5v4.1c0 2.9 1.9 5.1 4.6 6.2 2.7-1.1 4.6-3.3 4.6-6.2V3.5L8 1.8Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path
        d="M5.8 8.1 7.3 9.6 10.4 6.4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
