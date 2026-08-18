import styles from '../../server-spaces-page.module.css';

export function SpacesOnboardingIllustration({ label }: { label: string }) {
  return (
    <figure className={styles.art} role="img" aria-label={label}>
      <svg viewBox="0 0 280 148" className={styles.svg} aria-hidden="true">
        <rect
          x="18"
          y="28"
          width="70"
          height="92"
          rx="12"
          fill="var(--color-background)"
          stroke="currentColor"
          strokeWidth="1.6"
        />
        <rect x="30" y="44" width="46" height="8" rx="3" fill="currentColor" opacity="0.4" />
        <rect x="30" y="60" width="46" height="8" rx="3" fill="currentColor" opacity="0.22" />
        <rect x="30" y="76" width="46" height="8" rx="3" fill="currentColor" opacity="0.22" />
        <rect x="30" y="98" width="20" height="8" rx="2" fill="currentColor" opacity="0.5" />
        <line
          x1="88"
          y1="74"
          x2="168"
          y2="74"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeDasharray="4 4"
          opacity="0.75"
        />
        <circle
          cx="128"
          cy="74"
          r="12"
          fill="var(--color-surface)"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path
          d="M122 74h12M128 68v12"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <rect
          x="168"
          y="34"
          width="94"
          height="80"
          rx="14"
          fill="var(--color-background)"
          stroke="currentColor"
          strokeWidth="1.6"
        />
        <circle cx="194" cy="62" r="8" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <rect x="210" y="56" width="36" height="6" rx="2" fill="currentColor" opacity="0.45" />
        <rect x="210" y="68" width="28" height="5" rx="2" fill="currentColor" opacity="0.22" />
        <rect x="184" y="86" width="18" height="12" rx="3" fill="currentColor" opacity="0.28" />
        <rect x="208" y="86" width="18" height="12" rx="3" fill="currentColor" opacity="0.28" />
        <rect x="232" y="86" width="18" height="12" rx="3" fill="currentColor" opacity="0.28" />
      </svg>
    </figure>
  );
}
