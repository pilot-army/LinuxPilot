import styles from './login-form.module.css';

type AuthErrorProps = {
  message: string | null;
};

export function AuthError({ message }: AuthErrorProps) {
  if (!message) {
    return <p className="sr-only" aria-live="polite" />;
  }

  return (
    <p className={styles.error} role="alert" aria-live="polite">
      <svg className={styles.errorIcon} viewBox="0 0 16 16" aria-hidden="true" focusable="false">
        <circle cx="8" cy="8" r="6.1" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="M8 5v3.4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <circle cx="8" cy="11" r="0.7" fill="currentColor" />
      </svg>
      <span>{message}</span>
    </p>
  );
}
