import styles from '../../server-spaces-page.module.css';

type FirstSpaceIllustrationProps = {
  label: string;
  spaceLabel: string;
};

export function FirstSpaceIllustration({ label, spaceLabel }: FirstSpaceIllustrationProps) {
  return (
    <figure className={styles.firstArt} role="img" aria-label={label}>
      <svg viewBox="0 0 320 196" className={styles.svg} aria-hidden="true">
        <defs>
          <linearGradient id="space-folder" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="rgba(0, 209, 255, 0.16)" />
            <stop offset="100%" stopColor="rgba(10, 20, 36, 0.9)" />
          </linearGradient>
        </defs>
        <ServerGlyph x={18} y={18} status="#34d399" />
        <ServerGlyph x={18} y={78} status="#34d399" />
        <ServerGlyph x={18} y={138} status="#fbbf24" />
        <path
          d="M86 44c28 0 42 14 54 14"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeDasharray="3 4"
          opacity="0.55"
        />
        <path
          d="M86 104h54"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeDasharray="3 4"
          opacity="0.55"
        />
        <path
          d="M86 164c28 0 42-14 54-14"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeDasharray="3 4"
          opacity="0.55"
        />
        <circle
          cx="150"
          cy="98"
          r="14"
          fill="var(--color-surface)"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path
          d="M144 98h12M152 94l4 4-4 4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M176 46h46l10 10h72v118H176z"
          fill="url(#space-folder)"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <path
          d="M176 46h46l10 10H176z"
          fill="rgba(0, 209, 255, 0.22)"
          stroke="currentColor"
          strokeWidth="1.4"
        />
        <text x="196" y="64" fill="currentColor" fontSize="11" fontWeight="600">
          {spaceLabel}
        </text>
        <ServerGlyph x={198} y={70} compact status="#34d399" />
        <ServerGlyph x={198} y={108} compact status="#34d399" />
        <ServerGlyph x={198} y={146} compact status="#fbbf24" />
      </svg>
    </figure>
  );
}

function ServerGlyph({
  x,
  y,
  status,
  compact = false,
}: {
  x: number;
  y: number;
  status: string;
  compact?: boolean;
}) {
  const width = compact ? 86 : 64;
  const height = compact ? 28 : 44;
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect
        width={width}
        height={height}
        rx="8"
        fill="var(--color-background)"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <rect
        x="8"
        y={compact ? 8 : 10}
        width="10"
        height={compact ? 12 : 24}
        rx="2"
        fill="currentColor"
        opacity="0.28"
      />
      <rect
        x="22"
        y={compact ? 8 : 12}
        width={compact ? 42 : 28}
        height="5"
        rx="2"
        fill="currentColor"
        opacity="0.45"
      />
      {compact ? null : (
        <>
          <rect x="22" y="22" width="22" height="4" rx="2" fill="currentColor" opacity="0.22" />
          <rect x="22" y="30" width="16" height="4" rx="2" fill="currentColor" opacity="0.18" />
        </>
      )}
      <circle cx={width - 10} cy={compact ? 14 : 12} r="3.2" fill={status} />
    </g>
  );
}
