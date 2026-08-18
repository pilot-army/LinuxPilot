import { type InputHTMLAttributes, type ReactNode, forwardRef, useId } from 'react';
import styles from './text-field.module.css';

type TextFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'prefix'> & {
  label: string;
  error?: string;
  hint?: string;
  hintMuted?: boolean;
  success?: string;
  requiredMark?: boolean;
  badge?: string;
  prefix?: ReactNode;
  suffix?: ReactNode;
};

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  {
    label,
    error,
    hint,
    hintMuted,
    success,
    requiredMark,
    badge,
    prefix,
    suffix,
    className,
    ...props
  },
  ref,
) {
  const generatedId = useId();
  const inputId = props.name ? `field-${props.name}` : generatedId;
  const errorId = `${inputId}-error`;
  const hintId = `${inputId}-hint`;
  const successId = `${inputId}-success`;
  const describedBy =
    [error ? errorId : null, !error && success ? successId : null, hint ? hintId : null]
      .filter(Boolean)
      .join(' ') || undefined;
  const filled = typeof props.value === 'string' && props.value.length > 0;

  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={inputId}>
        <span>{label}</span>
        {requiredMark ? (
          <span className={styles.requiredMark} aria-hidden="true">
            *
          </span>
        ) : null}
        {badge ? <span className={styles.badge}>{badge}</span> : null}
      </label>
      <div className={styles.control}>
        {prefix ? <div className={styles.prefix}>{prefix}</div> : null}
        <input
          {...props}
          ref={ref}
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
      ) : success ? (
        <p
          className={styles.success}
          id={successId}
          data-testid={`${props.name}-success`}
          aria-live="polite"
        >
          <SuccessIcon />
          <span>{success}</span>
        </p>
      ) : null}
      {hint ? (
        <p className={hintMuted ? styles.hintMuted : styles.hint} id={hintId}>
          {hint}
        </p>
      ) : null}
    </div>
  );
});

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

function SuccessIcon() {
  return (
    <svg className={styles.successIcon} viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <circle cx="8" cy="8" r="6.1" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M5.2 8.2 7.1 10.2 10.8 5.8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
