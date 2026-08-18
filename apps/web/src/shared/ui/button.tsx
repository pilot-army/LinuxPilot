import type { ButtonHTMLAttributes, ReactNode } from 'react';
import styles from './button.module.css';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'md' | 'sm';
  block?: boolean;
  loading?: boolean;
  children: ReactNode;
};

export function Button({
  variant = 'primary',
  size = 'md',
  block,
  loading = false,
  disabled,
  children,
  className,
  type = 'button',
  ...props
}: ButtonProps) {
  const isBlock = block ?? (variant !== 'ghost' && size !== 'sm');
  const classes = [
    styles.button,
    styles[variant],
    size === 'sm' ? styles.sm : '',
    isBlock ? styles.block : styles.inline,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      {...props}
      type={type}
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
    >
      <span className={loading ? `${styles.label} ${styles.labelHidden}` : styles.label}>
        {children}
      </span>
      {loading ? <span className={styles.spinner} aria-hidden="true" /> : null}
    </button>
  );
}
