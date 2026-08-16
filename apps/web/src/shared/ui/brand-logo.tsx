import { useI18n } from '../../i18n';
import { BrandMark } from './brand-mark';
import styles from './brand-logo.module.css';

type BrandLogoProps = {
  compact?: boolean;
};

export function BrandLogo({ compact = false }: BrandLogoProps) {
  const { messages } = useI18n();

  return (
    <span className={`${styles.brand} ${compact ? styles.compact : ''}`}>
      <BrandMark className={styles.mark} size={compact ? 36 : 40} />
      <span className={styles.name}>{messages.common.brand.name}</span>
    </span>
  );
}
