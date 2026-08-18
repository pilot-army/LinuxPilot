import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & { title?: string };

function BaseIcon({ title, children, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      aria-hidden={title ? undefined : true}
      {...props}
    >
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  );
}

export function OverviewIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path
        d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </BaseIcon>
  );
}

export function CodeIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path
        d="M9 8 5 12l4 4M15 8l4 4-4 4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </BaseIcon>
  );
}

export function LinkIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path
        d="M10 13a5 5 0 0 0 7.07 0l1.41-1.41a5 5 0 0 0-7.07-7.07L10 5.93"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M14 11a5 5 0 0 0-7.07 0L5.52 12.41a5 5 0 0 0 7.07 7.07L14 18.07"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </BaseIcon>
  );
}

export function ServersIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <rect
        x="4"
        y="4"
        width="16"
        height="5"
        rx="1.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <rect
        x="4"
        y="10.5"
        width="16"
        height="5"
        rx="1.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <rect
        x="4"
        y="17"
        width="16"
        height="3"
        rx="1"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <circle cx="7.2" cy="6.5" r="0.7" fill="currentColor" />
      <circle cx="7.2" cy="13" r="0.7" fill="currentColor" />
    </BaseIcon>
  );
}

export function TerminalIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <rect
        x="3.5"
        y="5"
        width="17"
        height="14"
        rx="2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="M7 10l3 2-3 2M12 14h5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </BaseIcon>
  );
}

export function DockerIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path
        d="M4 13h3v3H4zm4.2 0h3v3h-3zm4.2 0h3v3h-3zM8.2 9.2h3v3h-3zm4.2 0h3v3h-3zm4.2 0h3v3h-3zM12.4 5.4h3v3h-3z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <path
        d="M4 16.4c1.6 2.4 4.6 3.2 8.4 3.2 5.2 0 8.2-2 9.1-5.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
      />
    </BaseIcon>
  );
}

export function FilesIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path
        d="M7 4h7l5 5v11a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path d="M14 4v5h5" fill="none" stroke="currentColor" strokeWidth="1.7" />
    </BaseIcon>
  );
}

export function DatabasesIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <ellipse
        cx="12"
        cy="6.5"
        rx="7"
        ry="2.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="M5 6.5v11c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5v-11"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="M5 12c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
      />
    </BaseIcon>
  );
}

export function MonitoringIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="12" cy="12" r="2" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M12 4v3M20 12h-3M12 20v-3M4 12h3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
      />
    </BaseIcon>
  );
}

export function SettingsIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M12 4.5v2.2M12 17.3V19.5M19.5 12h-2.2M6.7 12H4.5M17.3 6.7l-1.6 1.6M8.3 15.7l-1.6 1.6M17.3 17.3l-1.6-1.6M8.3 8.3 6.7 6.7"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </BaseIcon>
  );
}

export function CpuIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <rect
        x="7"
        y="7"
        width="10"
        height="10"
        rx="1.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <rect
        x="10"
        y="10"
        width="4"
        height="4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M9 4.5v2.5M12 4.5v2.5M15 4.5v2.5M9 17v2.5M12 17v2.5M15 17v2.5M4.5 9h2.5M4.5 12h2.5M4.5 15h2.5M17 9h2.5M17 12h2.5M17 15h2.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </BaseIcon>
  );
}

export function DiskIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <rect
        x="4"
        y="6"
        width="16"
        height="12"
        rx="2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <circle cx="9" cy="12" r="1.6" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M13 10h4M13 14h3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </BaseIcon>
  );
}

export function RefreshIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path
        d="M19 12a7 7 0 1 1-2-4.9"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M17 4.5v4h4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </BaseIcon>
  );
}

export function ChevronIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path
        d="M9 6l6 6-6 6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </BaseIcon>
  );
}

export function MenuIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path
        d="M5 7h14M5 12h14M5 17h14"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </BaseIcon>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path
        d="M6 6l12 12M18 6 6 18"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </BaseIcon>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path
        d="M5 12.5 9.5 17 19 7.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </BaseIcon>
  );
}

export function WarningIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path
        d="M12 4.5 21 19H3L12 4.5z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M12 10v4.2M12 16.6v.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </BaseIcon>
  );
}

export function ErrorIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M9 9l6 6M15 9l-6 6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </BaseIcon>
  );
}

export function InfoIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M12 11v5M12 8v.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </BaseIcon>
  );
}

export function PlusIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path
        d="M12 5v14M5 12h14"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </BaseIcon>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx="11" cy="11" r="6" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M16 16l4 4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </BaseIcon>
  );
}

export function FilterIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path
        d="M4 6h16M7 12h10M10 18h4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </BaseIcon>
  );
}

export function ExternalIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path
        d="M9 5H5v14h14v-4M13 5h6v6M19 5l-8 8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </BaseIcon>
  );
}

export function CollapseIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path
        d="M11 6 5 12l6 6M19 6l-6 6 6 6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </BaseIcon>
  );
}

export function ExpandIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path
        d="M5 6l6 6-6 6M13 6l6 6-6 6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </BaseIcon>
  );
}

export function FolderIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path
        d="M4 8.2V18a1.4 1.4 0 0 0 1.4 1.4h13.2A1.4 1.4 0 0 0 20 18V10.2A1.4 1.4 0 0 0 18.6 8.8H12L10.2 6.6H5.4A1.4 1.4 0 0 0 4 8.2z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </BaseIcon>
  );
}

export function PlayIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M8 6.5v11L18 12z" fill="currentColor" />
    </BaseIcon>
  );
}

export function FileUpIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path
        d="M14 3H7.5A1.5 1.5 0 0 0 6 4.5v15A1.5 1.5 0 0 0 7.5 21h9A1.5 1.5 0 0 0 18 19.5V9z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M14 3v6h6M12 17v-6M9.5 13.5 12 11l2.5 2.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </BaseIcon>
  );
}

export function GridIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <rect
        x="4"
        y="4"
        width="7"
        height="7"
        rx="1.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <rect
        x="13"
        y="4"
        width="7"
        height="7"
        rx="1.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <rect
        x="4"
        y="13"
        width="7"
        height="7"
        rx="1.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <rect
        x="13"
        y="13"
        width="7"
        height="7"
        rx="1.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
      />
    </BaseIcon>
  );
}

export function ListIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path
        d="M8 7h12M8 12h12M8 17h12M4 7h.01M4 12h.01M4 17h.01"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </BaseIcon>
  );
}

export function MoreIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx="12" cy="6" r="1.3" fill="currentColor" />
      <circle cx="12" cy="12" r="1.3" fill="currentColor" />
      <circle cx="12" cy="18" r="1.3" fill="currentColor" />
    </BaseIcon>
  );
}

export function ChartIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path
        d="M4 18V6M4 18h16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M7 14l3.2-3.4 2.6 2.2L17 8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </BaseIcon>
  );
}

export function ShieldIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path
        d="M12 3.5 19 6.2v5.3c0 4.2-2.8 7.2-7 8.8-4.2-1.6-7-4.6-7-8.8V6.2z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M9.2 12.1 11.1 14l3.7-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </BaseIcon>
  );
}

export function OperationsIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M12 8v4l2.5 1.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </BaseIcon>
  );
}

export function ColumnsIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <rect
        x="4"
        y="5"
        width="5"
        height="14"
        rx="1.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <rect
        x="10.5"
        y="5"
        width="4"
        height="14"
        rx="1.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <rect
        x="16"
        y="5"
        width="4"
        height="14"
        rx="1.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
      />
    </BaseIcon>
  );
}

export function DownloadIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path
        d="M12 5v10M8 11l4 4 4-4M6 19h12"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </BaseIcon>
  );
}

export function BellIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path
        d="M6.2 9.4a5.8 5.8 0 0 1 11.6 0c0 4 1.2 5.2 1.2 5.2H5s1.2-1.2 1.2-5.2Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M10 18.2a2 2 0 0 0 4 0"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </BaseIcon>
  );
}

export function LogoutIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path
        d="M10 12h9M16.5 8.5 20 12l-3.5 3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M14 5.5H7.5A1.5 1.5 0 0 0 6 7v10a1.5 1.5 0 0 0 1.5 1.5H14"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </BaseIcon>
  );
}

export function CopyIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <rect
        x="8"
        y="8"
        width="11"
        height="11"
        rx="1.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="M5.5 16V5.5H16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </BaseIcon>
  );
}

export function CalendarIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <rect
        x="4"
        y="6"
        width="16"
        height="14"
        rx="2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="M8 4v4M16 4v4M4 11h16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </BaseIcon>
  );
}

export function DocsIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path
        d="M7 4h6.5L18 8.5V20H7a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M13.5 4v4.5H18M9 13h6M9 16.5h4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
      />
    </BaseIcon>
  );
}

export function ConnectionIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path
        d="M4 12h3.2L9.4 6l3.2 12 2.2-6H20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </BaseIcon>
  );
}

export function RequirementsIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <rect
        x="6"
        y="4"
        width="12"
        height="16"
        rx="2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="M9 9h6M9 12.5h6M9 16h4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </BaseIcon>
  );
}

export function KeyIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx="8" cy="12" r="3.2" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M11 12h8l-2 2M16.5 12v2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </BaseIcon>
  );
}

export function SparkleIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path
        d="M12 3.5 13.2 8.4 18 9.5 13.2 10.6 12 15.5 10.8 10.6 6 9.5 10.8 8.4z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M18.2 14.2 18.8 16.4 21 17l-2.2.6-.6 2.2-.6-2.2-2.2-.6 2.2-.6z"
        fill="currentColor"
      />
    </BaseIcon>
  );
}

export function UbuntuIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx="12" cy="12" r="8.2" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="12" cy="6.1" r="1.65" fill="currentColor" />
      <circle cx="17.15" cy="15" r="1.65" fill="currentColor" />
      <circle cx="6.85" cy="15" r="1.65" fill="currentColor" />
      <path
        d="M12 8.3v2.8M15 16.1l-2.4-1.4M9 16.1l2.4-1.4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </BaseIcon>
  );
}

export function DebianIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path
        d="M13.4 4.7c3.5.5 6 3.4 6 7.1 0 4.5-3.5 7.7-8 7.7-3.2 0-5.8-1.6-6.9-4.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M8.4 6.3c1.2-1 2.7-1.6 4.3-1.5 2.5.2 4.3 2.1 4.3 4.6 0 2.8-2.1 4.6-4.8 4.6-1.6 0-2.9-.7-3.6-1.8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <circle cx="9.3" cy="8.5" r="1.05" fill="currentColor" />
    </BaseIcon>
  );
}

export function LinuxIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <ellipse
        cx="12"
        cy="8.1"
        rx="3.3"
        ry="3.1"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="M8.7 10.5c-1.6 1.8-2.4 3.8-2.2 6.1 0 2.2 2.4 3.6 5.5 3.6s5.5-1.4 5.5-3.6c.2-2.3-.6-4.3-2.2-6.1"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <circle cx="10.8" cy="7.9" r="0.7" fill="currentColor" />
      <circle cx="13.2" cy="7.9" r="0.7" fill="currentColor" />
      <path
        d="M10.6 9.6c.8.7 2 .7 2.8 0"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </BaseIcon>
  );
}

export function Arm64Icon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <rect
        x="6"
        y="6"
        width="12"
        height="12"
        rx="3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="M9 12h6M12 9v6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M8 4.5v1.5M12 4.5v1.5M16 4.5v1.5M8 18v1.5M12 18v1.5M16 18v1.5M4.5 8h1.5M4.5 12h1.5M4.5 16h1.5M18 8h1.5M18 12h1.5M18 16h1.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </BaseIcon>
  );
}

export function ClockIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M12 8v4.2L15 15"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </BaseIcon>
  );
}

export function EyeIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path
        d="M3.5 12s3.2-6 8.5-6 8.5 6 8.5 6-3.2 6-8.5 6-8.5-6-8.5-6Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="2.2" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </BaseIcon>
  );
}

export function EyeOffIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path
        d="M4 5.5 19.5 19"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M9.2 7.3C10.1 7 11 6.9 12 6.9c5.3 0 8.5 6 8.5 6a14 14 0 0 1-3.1 3.5M6.4 9.2A14 14 0 0 0 3.5 12s3.2 6 8.5 6c1.2 0 2.3-.2 3.3-.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </BaseIcon>
  );
}

export function LockIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <rect
        x="6"
        y="11"
        width="12"
        height="9"
        rx="1.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="M8.5 11V8.2a3.5 3.5 0 0 1 7 0V11"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </BaseIcon>
  );
}

export function HomeIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path
        d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </BaseIcon>
  );
}

export function UsersIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx="9" cy="8.5" r="2.4" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M4.5 18c.4-2.6 2.3-4 4.5-4s4.1 1.4 4.5 4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <circle cx="16.2" cy="9.2" r="2" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M15.2 14.2c1.8.2 3.3 1.3 3.8 3.3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </BaseIcon>
  );
}

export function MemoryIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <rect
        x="3.5"
        y="7"
        width="17"
        height="10"
        rx="1.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path d="M7 7v10M12 7v10M17 7v10" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </BaseIcon>
  );
}

export function NetworkIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path
        d="M4 16.5 8 8l4 9 4-12 4 9"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </BaseIcon>
  );
}

export function PowerIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path
        d="M12 4.5v7"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M7.2 7.4a6.5 6.5 0 1 0 9.6 0"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </BaseIcon>
  );
}

export function FlagIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path
        d="M6 4.5v15"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M6 5.2h10.5l-2.2 3.4 2.2 3.4H6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </BaseIcon>
  );
}

export function ArrowRightIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path
        d="M5 12h14M13 6l6 6-6 6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </BaseIcon>
  );
}

export function InboxIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path
        d="M4 13.5 7.2 5h9.6L20 13.5V19a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M4 13.5h4.2l1.3 2.3h5l1.3-2.3H20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </BaseIcon>
  );
}

export function BackupIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <ellipse cx="12" cy="7" rx="7" ry="2.4" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M5 7v10c0 1.3 3.1 2.4 7 2.4s7-1.1 7-2.4V7"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="M5 12c0 1.3 3.1 2.4 7 2.4s7-1.1 7-2.4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
      />
    </BaseIcon>
  );
}

export function AlmaIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M8 14.5 12 7l4 7.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </BaseIcon>
  );
}

export function RockyIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path
        d="M4.5 16.5 12 5.5l7.5 11H4.5Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </BaseIcon>
  );
}

export function ChevronDownIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path
        d="M6 9.5 12 15.5 18 9.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </BaseIcon>
  );
}
