import { type InputHTMLAttributes, useState } from 'react';
import { useI18n } from '../../i18n';
import { TextField } from '../../shared/ui/text-field';
import styles from './password-field.module.css';

type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'type' | 'suffix'> & {
  label: string;
  error?: string;
  hint?: string;
};

export function PasswordInput({ disabled, ...props }: PasswordInputProps) {
  const { messages } = useI18n();
  const [visible, setVisible] = useState(false);

  return (
    <TextField
      {...props}
      type={visible ? 'text' : 'password'}
      disabled={disabled}
      prefix={<LockIcon />}
      suffix={
        <button
          type="button"
          className={styles.toggle}
          onClick={() => setVisible((current) => !current)}
          disabled={disabled}
          aria-pressed={visible}
          aria-label={visible ? messages.auth.password.hide : messages.auth.password.show}
        >
          <svg className={styles.icon} viewBox="0 0 20 20" aria-hidden="true" focusable="false">
            {visible ? (
              <path
                fill="currentColor"
                d="M2.3 3.7 3.7 2.3l14 14-1.4 1.4-2.4-2.4A9.4 9.4 0 0 1 10 17C5 17 1.3 13.4.4 10.6a1.6 1.6 0 0 1 0-1.2 11 11 0 0 1 4.2-4.8L2.3 3.7ZM10 7a3 3 0 0 1 3 3c0 .4 0 .7-.2 1L9 7.2c.3-.1.6-.2 1-.2Zm0-4c5 0 8.7 3.6 9.6 6.4.2.4.2.8 0 1.2-.5 1.5-1.7 3.2-3.5 4.5l-1.5-1.5A8 8 0 0 0 17.4 10 8.7 8.7 0 0 0 10 6c-.6 0-1.1 0-1.6.2L6.8 4.6C7.8 4.2 8.9 4 10 4Z"
              />
            ) : (
              <path
                fill="currentColor"
                d="M10 4c5 0 8.7 3.6 9.6 6.4.2.4.2.8 0 1.2C18.7 14.4 15 18 10 18S1.3 14.4.4 11.6a1.6 1.6 0 0 1 0-1.2C1.3 7.6 5 4 10 4Zm0 2A8.7 8.7 0 0 0 2.6 10 8.7 8.7 0 0 0 10 14a8.7 8.7 0 0 0 7.4-4A8.7 8.7 0 0 0 10 6Zm0 2a2 2 0 1 1 0 4 2 2 0 0 1 0-4Z"
              />
            )}
          </svg>
        </button>
      }
    />
  );
}

function LockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true" focusable="false">
      <rect
        x="4.4"
        y="8.6"
        width="11.2"
        height="8"
        rx="1.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M7 8.6V6.6a3 3 0 0 1 6 0v2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
