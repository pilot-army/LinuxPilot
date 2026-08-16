import { useI18n } from '../../i18n';
import { Button } from '../../shared/ui/button';
import styles from './passkey-button.module.css';

type PasskeyButtonProps = {
  disabled?: boolean;
};

export function PasskeyButton({ disabled: _disabled }: PasskeyButtonProps) {
  const { messages } = useI18n();

  return (
    <div className={styles.wrap}>
      <Button
        type="button"
        variant="secondary"
        data-testid="passkey-button"
        disabled
        aria-disabled="true"
        title={messages.auth.login.passkeyUnavailable}
      >
        <span className={styles.content}>
          <FingerprintIcon />
          {messages.auth.login.passkey}
        </span>
      </Button>
      <p className={styles.notice} role="note">
        {messages.auth.login.passkeyUnavailable}
      </p>
    </div>
  );
}

function FingerprintIcon() {
  return (
    <svg className={styles.icon} viewBox="0 0 20 20" aria-hidden="true" focusable="false">
      <path
        d="M10 3.4c2.4 0 4.4 1.5 5.1 3.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M4.6 8.2A5.5 5.5 0 0 1 10 5.2c1.8 0 3.4.8 4.4 2.1"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M6.2 16.6c-.8-1.3-1.2-2.8-1.2-4.4 0-2.8 2.2-5 5-5s5 2.2 5 5c0 .7-.1 1.4-.3 2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M10 9.4c1.4 0 2.5 1.2 2.5 2.8 0 2.1-.6 3.6-1.6 5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M8.2 12.4c0 1.8.4 3.1 1.2 4.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
