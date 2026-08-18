import { useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { MoreIcon, ServersIcon } from '../../../features/dashboard/icons';
import { isHighLoad } from '../../../features/dashboard/compute';
import {
  formatCompactPercent,
  formatUptime,
  interpolate,
} from '../../../features/dashboard/format';
import type { DashboardServer } from '../../../features/dashboard/types';
import { useI18n } from '../../../i18n';
import { AnchoredPopover } from '../../../shared/ui/anchored-popover';
import styles from '../dashboard-page.module.css';

type ServerRowProps = {
  server: DashboardServer;
  selected: boolean;
  canDelete: boolean;
  onSelect: () => void;
  onDelete: (server: DashboardServer) => void;
};

export function ServerRow({ server, selected, canDelete, onSelect, onDelete }: ServerRowProps) {
  const { messages } = useI18n();
  const statusLabel = messages.dashboard.status[server.status];
  const openLabel = interpolate(messages.dashboard.actions.openServer, { name: server.name });
  const title = server.name;
  const ip = server.ipAddress;
  const lastSeenMissing = !server.hasAgent;
  const [menuOpen, setMenuOpen] = useState(false);
  const menuTriggerRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  return (
    <div
      className={`${styles.serverRow} ${selected ? styles.serverRowSelected : ''}`}
      data-testid={`dashboard-server-${server.id}`}
    >
      <Link
        to={`/servers/${server.id}`}
        className={styles.serverMain}
        aria-label={openLabel}
        onClick={onSelect}
      >
        <div className={styles.serverIdentity}>
          <span className={styles.serverGlyph} aria-hidden="true">
            <ServersIcon />
          </span>
          <span className={styles.serverNames}>
            <strong title={title}>{title}</strong>
            <small title={ip ?? undefined}>{ip ?? '—'}</small>
          </span>
        </div>
        <span className={`${styles.statusBadge} ${styles[`status-${server.status}`]}`}>
          <span className={styles.statusDot} aria-hidden="true" />
          <span className={styles.statusLabel}>{statusLabel}</span>
        </span>
        <ResourceMeter label={messages.dashboard.servers.columns.cpu} value={server.cpuPercent} />
        <ResourceMeter label={messages.dashboard.servers.columns.ram} value={server.ramPercent} />
        <ResourceMeter label={messages.dashboard.servers.columns.disk} value={server.diskPercent} />
        <time className={styles.lastSeen}>
          {lastSeenMissing
            ? '—'
            : formatUptime(server.uptimeSeconds, {
                days: messages.dashboard.time.uptimeDays,
                hours: messages.dashboard.time.uptimeHours,
                minutes: messages.dashboard.time.uptimeMinutes,
                none: messages.dashboard.time.uptimeNone,
              })}
        </time>
      </Link>
      <div className={styles.serverMenu}>
        <button
          ref={menuTriggerRef}
          type="button"
          className={styles.menuTrigger}
          aria-label={messages.dashboard.actions.serverMenu}
          aria-expanded={menuOpen}
          aria-controls={menuId}
          data-testid={`dashboard-server-menu-${server.id}`}
          onClick={() => {
            onSelect();
            setMenuOpen((open) => !open);
          }}
        >
          <MoreIcon />
        </button>
        <AnchoredPopover
          open={menuOpen}
          onClose={() => setMenuOpen(false)}
          anchorRef={menuTriggerRef}
          id={menuId}
          role="menu"
          className={styles.menuPopover}
        >
          <Link to={`/servers/${server.id}`} role="menuitem" onClick={() => setMenuOpen(false)}>
            {openLabel}
          </Link>
          {server.hasAgent ? null : (
            <Link
              to={`/servers/${server.id}`}
              role="menuitem"
              data-testid={`connect-agent-${server.id}`}
              onClick={() => setMenuOpen(false)}
            >
              {messages.dashboard.actions.connectAgent}
            </Link>
          )}
          {canDelete ? (
            <button
              type="button"
              role="menuitem"
              className={styles.menuDanger}
              data-testid={`delete-server-${server.id}`}
              onClick={() => {
                setMenuOpen(false);
                onDelete(server);
              }}
            >
              {messages.dashboard.actions.deleteServer}
            </button>
          ) : null}
        </AnchoredPopover>
      </div>
    </div>
  );
}

function ResourceMeter({ label, value }: { label: string; value: number | null }) {
  const high = isHighLoad(value);
  const width = value === null ? 0 : Math.min(100, Math.max(0, value));

  return (
    <div className={styles.meter}>
      <div className={styles.meterHead}>
        <span>{label}</span>
        <strong className={high ? styles.meterHigh : undefined}>
          {formatCompactPercent(value)}
        </strong>
      </div>
      {value === null ? null : (
        <div className={styles.meterTrack} aria-hidden="true">
          <span
            className={`${styles.meterFill} ${high ? styles.meterFillHigh : ''}`}
            style={{ width: `${width}%` }}
          />
        </div>
      )}
    </div>
  );
}
