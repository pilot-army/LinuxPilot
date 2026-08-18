import type { SVGProps } from 'react';

type LogoProps = SVGProps<SVGSVGElement>;

export function UbuntuLogo(props: LogoProps) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" {...props}>
      <circle cx="12" cy="12" r="12" fill="#E95420" />
      <circle cx="12" cy="12" r="3.55" fill="none" stroke="#fff" strokeWidth="1.7" />
      <circle cx="12" cy="4.15" r="1.95" fill="#fff" />
      <circle cx="18.8" cy="15.92" r="1.95" fill="#fff" />
      <circle cx="5.2" cy="15.92" r="1.95" fill="#fff" />
      <path
        d="M12 8.35v1.85M15.05 13.85l1.6.92M8.95 13.85l-1.6.92"
        fill="none"
        stroke="#fff"
        strokeWidth="1.7"
        strokeLinecap="butt"
      />
    </svg>
  );
}

export function DebianLogo(props: LogoProps) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" {...props}>
      <circle cx="12" cy="12" r="12" fill="#A80030" />
      <path
        fill="#fff"
        d="M13.15 4.2c1.62.14 3.12.78 4.28 1.82 2.38 2.12 3.05 5.45 1.72 8.28-.98 2.08-2.95 3.55-5.22 3.98-1.62.3-3.3.05-4.75-.72-.55-.32-.72-1.02-.4-1.57.32-.55 1.02-.72 1.57-.4.48.28.78.82.7 1.35 1.02.48 2.2.55 3.28.22 1.55-.48 2.68-1.78 3.02-3.38.52-2.42-.5-4.95-2.55-6.22-1.55-.95-3.5-1.05-5.15-.28-1.92.9-3.22 2.8-3.42 4.95-.08.88.02 1.75.32 2.58.15.42-.08.88-.5 1.02-.42.15-.88-.08-1.02-.5-.4-1.1-.52-2.28-.42-3.45.32-3.22 2.48-6.05 5.5-7.18 1.18-.45 2.45-.6 3.7-.5z"
      />
      <circle cx="9.05" cy="8.45" r="1.05" fill="#fff" />
    </svg>
  );
}

export function AlmaLinuxLogo(props: LogoProps) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" {...props}>
      <circle cx="12" cy="12" r="12" fill="#082F49" />
      <path fill="#1B7FA8" d="M3.8 17.6 12 5.2l8.2 12.4H3.8z" />
      <path fill="#32C5E2" d="M7.2 17.6 12 10.2l4.8 7.4H7.2z" />
      <path fill="#082F49" d="M10.15 17.6h3.7L12 14.55 10.15 17.6z" />
    </svg>
  );
}

export function RockyLinuxLogo(props: LogoProps) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" {...props}>
      <circle cx="12" cy="12" r="12" fill="#10B981" />
      <path
        fill="#fff"
        d="M4.2 16.8 12 5.6l7.8 11.2h-3.15L12 10.55 7.35 16.8H4.2zm4.55 0h6.5L12 13.05 8.75 16.8z"
      />
    </svg>
  );
}
