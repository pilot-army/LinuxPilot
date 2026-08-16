import { BrandMark } from './brand-mark';
import styles from './logo.module.css';

type LogoProps = {
  compact?: boolean;
  showTagline?: boolean;
};

export function Logo({ compact = false, showTagline = false }: LogoProps) {
  return (
    <span className={`${styles.brand} ${compact ? styles.compact : ''}`}>
      <BrandMark className={styles.mark} size={compact ? 36 : 40} />
      <span className={styles.wordmark}>
        <span className={styles.name}>LinuxPilot</span>
        {showTagline ? <span className={styles.tag}>Server Control Center</span> : null}
      </span>
    </span>
  );
}
