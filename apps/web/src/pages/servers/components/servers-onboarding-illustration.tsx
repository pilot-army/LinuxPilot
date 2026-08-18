import styles from '../servers-page.module.css';

type ServersOnboardingIllustrationProps = {
  label: string;
};

export function ServersOnboardingIllustration({ label }: ServersOnboardingIllustrationProps) {
  return (
    <figure className={styles.onboardingArt} role="img" aria-label={label}>
      <svg viewBox="0 0 280 148" className={styles.onboardingSvg} aria-hidden="true">
        <rect
          x="16"
          y="26"
          width="74"
          height="96"
          rx="12"
          fill="var(--background)"
          stroke="currentColor"
          strokeWidth="1.6"
        />
        <rect x="28" y="42" width="50" height="9" rx="3" fill="currentColor" opacity="0.38" />
        <rect x="28" y="58" width="50" height="9" rx="3" fill="currentColor" opacity="0.22" />
        <rect x="28" y="74" width="50" height="9" rx="3" fill="currentColor" opacity="0.22" />
        <rect x="28" y="96" width="22" height="8" rx="2" fill="currentColor" opacity="0.5" />

        <line
          x1="90"
          y1="74"
          x2="168"
          y2="74"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeDasharray="4 4"
          opacity="0.75"
        />
        <circle
          cx="129"
          cy="74"
          r="13"
          fill="var(--surface-elevated, #0a1733)"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path
          d="M124.2 74.4v-2.8a4.8 4.8 0 0 1 9.6 0v2.8"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <rect
          x="123.6"
          y="74"
          width="10.8"
          height="8.2"
          rx="1.6"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        />

        <rect
          x="168"
          y="32"
          width="96"
          height="70"
          rx="10"
          fill="var(--background)"
          stroke="currentColor"
          strokeWidth="1.6"
        />
        <g
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M216 48v10" />
          <path d="M210 54.5 216 48l6 6.5" />
          <path d="M204 57h8M220 57h8" />
          <path d="M206 61h6M220 61h6" opacity="0.7" />
          <rect x="208" y="66" width="16" height="4.5" rx="1.2" />
          <rect x="208" y="72.5" width="16" height="4.5" rx="1.2" />
          <rect x="208" y="79" width="16" height="4.5" rx="1.2" />
        </g>
        <circle cx="211.2" cy="68.2" r="0.7" fill="currentColor" />
        <circle cx="211.2" cy="74.7" r="0.7" fill="currentColor" />
        <circle cx="211.2" cy="81.2" r="0.7" fill="currentColor" />
        <rect x="162" y="104" width="108" height="7" rx="2.5" fill="currentColor" opacity="0.22" />
        <rect x="192" y="111" width="48" height="4" rx="1.5" fill="currentColor" opacity="0.14" />
      </svg>
    </figure>
  );
}
