import { BrandMark } from './brand-mark';
import styles from './logo.module.css';

type LogoProps = {
  compact?: boolean;
  showTagline?: boolean;
  showWordmark?: boolean;
};

export function Logo({ compact = false, showTagline = false, showWordmark = true }: LogoProps) {
  return (
    <span className={`${styles.brand} ${compact ? styles.compact : ''}`}>
      <BrandMark className={styles.mark} size={compact ? 36 : 40} />
      {showWordmark ? (
        <span className={styles.wordmark} data-logo-wordmark="">
          <span className={styles.name}>LinuxPilot</span>
          {showTagline ? <span className={styles.tag}>Server Control Center</span> : null}
        </span>
      ) : null}
    </span>
  );
}
