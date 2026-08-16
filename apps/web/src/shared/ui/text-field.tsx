import { type InputHTMLAttributes, type ReactNode, useId } from 'react';
import styles from './text-field.module.css';

type TextFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'prefix'> & {
  label: string;
  error?: string;
  hint?: string;
  prefix?: ReactNode;
  suffix?: ReactNode;
};

export function TextField({
  label,
  error,
  hint,
  prefix,
  suffix,
  className,
  ...props
}: TextFieldProps) {
  const generatedId = useId();
  const inputId = props.name ? `field-${props.name}` : generatedId;
  const errorId = `${inputId}-error`;
  const hintId = `${inputId}-hint`;
  const describedBy =
    [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined;
  const filled = typeof props.value === 'string' && props.value.length > 0;

  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={inputId}>
        {label}
      </label>
      <div className={styles.control}>
        {prefix ? <div className={styles.prefix}>{prefix}</div> : null}
        <input
          {...props}
          id={inputId}
          className={[
            styles.input,
            prefix ? styles.hasPrefix : '',
            suffix ? styles.hasSuffix : '',
            filled ? styles.filled : '',
            error ? styles.invalid : '',
            className,
          ]
            .filter(Boolean)
            .join(' ')}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
        />
        {error && !suffix ? (
          <div className={styles.errorMark} aria-hidden="true">
            <ErrorIcon />
          </div>
        ) : null}
        {suffix ? <div className={styles.suffix}>{suffix}</div> : null}
      </div>
      {error ? (
        <p className={styles.error} id={errorId} role="alert" aria-live="polite">
          <ErrorIcon />
          <span>{error}</span>
        </p>
      ) : null}
      {hint ? (
        <p className={styles.hint} id={hintId}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function ErrorIcon() {
  return (
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
  );
}
