import { useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AGENT_STATUSES, SERVER_STATUSES, type ServerSummary } from '@linuxpilot/server-contracts';
import {
  DebianIcon,
  LinuxIcon,
  MoreIcon,
  TerminalIcon,
  UbuntuIcon,
} from '../../../features/dashboard/icons';
import { hasInstalledAgent, metricTone, ratioToPercent } from '../../../features/servers/compute';
import {
  formatBytes,
  formatExactTime,
  formatLastSeen,
  formatPercentCompact,
  formatUptime,
  interpolate,
} from '../../../features/servers/format';
import { useI18n } from '../../../i18n';
import { AnchoredPopover } from '../../../shared/ui/anchored-popover';
import { ServerResources } from './server-resources';
import styles from '../servers-page.module.css';

type ServerTableRowProps = {
  server: ServerSummary;
  selected: boolean;
  active: boolean;
  canDelete: boolean;
  canUpdate: boolean;
  canTerminal: boolean;
  onToggle: () => void;
  onOpen: () => void;
  onDelete: () => void;
  onRevoke: () => void;
};

export function ServerTableRow({
  server,
  selected,
  active,
  canDelete,
  canUpdate,
  canTerminal,
  onToggle,
  onOpen,
  onDelete,
  onRevoke,
}: ServerTableRowProps) {
  const { locale, messages } = useI18n();
  const copy = messages.servers.list;
  const title = server.name;
  const ip = server.primaryIp;
  const hasAgent = hasInstalledAgent(server);
  const spaceName = server.spaceName ?? server.groupName;
  const tags = server.tags;
  const [menuOpen, setMenuOpen] = useState(false);
  const menuTriggerRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();
  const lastSeen = formatLastSeen(server.lastSeenAt, copy.time);
  const exact = formatExactTime(server.lastSeenAt, locale);
  const stale = server.status === SERVER_STATUSES.OFFLINE && hasAgent;
  const terminalReason = !canTerminal
    ? copy.terminalForbidden
    : !hasAgent
      ? copy.terminalNeedsAgent
      : copy.terminalUnavailable;
  const agentLabel = !hasAgent
    ? copy.agentMissing
    : server.agentStatus === AGENT_STATUSES.OUTDATED
      ? copy.agentUpdateAvailable
      : server.agentVersion
        ? interpolate(copy.agentVersion, { version: server.agentVersion })
        : copy.agentInstalled;
  const cpu = hasAgent ? server.cpuUsagePercent : null;
  const ram = hasAgent ? ratioToPercent(server.memoryUsedBytes, server.memoryTotalBytes) : null;
  const disk = hasAgent ? ratioToPercent(server.diskUsedBytes, server.diskTotalBytes) : null;

  return (
    <tr
      className={`${styles.row} ${selected ? styles.rowSelected : ''} ${active ? styles.rowActive : ''}`}
      aria-selected={selected}
      data-testid={`server-row-${server.id}`}
    >
      <td>
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggle}
          aria-label={interpolate(copy.selectServer, { name: title })}
        />
      </td>
      <td>
        <Link
          to={`/servers/${server.id}`}
          className={styles.serverCell}
          data-testid={`server-open-${server.id}`}
        >
          <span
            className={`${styles.statusDot} ${styles[`dot-${server.status.toLowerCase()}`]}`}
            aria-hidden="true"
          />
          <span className={styles.serverNames}>
            <strong title={title}>{title}</strong>
            <small title={ip ?? undefined}>{ip ?? '—'}</small>
            {tags.length > 0 ? (
              <span className={styles.tagRow}>
                {tags.map((tag) => (
                  <span key={tag} className={styles.tag}>
                    {tag}
                  </span>
                ))}
              </span>
            ) : null}
          </span>
        </Link>
      </td>
      <td>
        <span className={styles.envBadge} title={spaceName ?? copy.noSpace}>
          {spaceName ?? copy.noSpace}
        </span>
      </td>
      <td>
        <span
          className={`${styles.statusBadge} ${styles[`status-${server.status.toLowerCase()}`]}`}
        >
          <span className={styles.statusDot} aria-hidden="true" />
          {messages.servers.status[server.status]}
        </span>
      </td>
      <td className={styles.colOs}>
        <span className={styles.osCell}>
          <span className={styles.osMark} aria-hidden="true">
            <OsGlyph name={server.osName} />
          </span>
          <span>
            <strong>
              {[server.osName, server.osVersion].filter(Boolean).join(' ') || '—'}
              {server.architecture ? ` · ${server.architecture}` : ''}
            </strong>
            <small className={hasAgent ? undefined : styles.agentMissing}>{agentLabel}</small>
          </span>
        </span>
      </td>
      <td className={styles.colCpu}>
        <MiniMeter
          label={copy.columns.cpu}
          value={cpu}
          stale={stale}
          staleLabel={exact ? interpolate(copy.metricsStale, { time: exact }) : undefined}
        />
      </td>
      <td className={styles.colRam}>
        <MiniMeter
          label={copy.columns.ram}
          value={ram}
          stale={stale}
          staleLabel={exact ? interpolate(copy.metricsStale, { time: exact }) : undefined}
        />
      </td>
      <td className={styles.colDisk}>
        <MiniMeter
          label={copy.columns.disk}
          value={disk}
          stale={stale}
          staleLabel={exact ? interpolate(copy.metricsStale, { time: exact }) : undefined}
          detail={
            hasAgent && server.diskUsedBytes !== null && server.diskTotalBytes !== null
              ? `${formatBytes(server.diskUsedBytes)} / ${formatBytes(server.diskTotalBytes)}`
              : undefined
          }
        />
      </td>
      <td>
        <span className={styles.uptimeCell}>
          <strong>{hasAgent ? formatUptime(server.uptimeSeconds) : '—'}</strong>
          <time dateTime={server.lastSeenAt ?? undefined} title={exact || undefined}>
            {lastSeen}
          </time>
        </span>
      </td>
      <td>
        <div className={styles.rowActions}>
          <button
            type="button"
            className={styles.iconQuiet}
            aria-label={copy.terminalAction}
            title={terminalReason}
            disabled
          >
            <TerminalIcon />
          </button>
          <div className={styles.rowMenu}>
            <button
              ref={menuTriggerRef}
              type="button"
              className={styles.iconQuiet}
              aria-label={copy.moreActions}
              aria-expanded={menuOpen}
              aria-controls={menuId}
              onClick={() => setMenuOpen((open) => !open)}
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
              <Link
                to={`/servers/${server.id}`}
                role="menuitem"
                data-testid={`server-link-${server.id}`}
                onClick={() => setMenuOpen(false)}
              >
                {copy.bulk.open}
              </Link>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  onOpen();
                }}
              >
                {copy.inspector.title}
              </button>
              {canUpdate || canDelete ? (
                <>
                  {canDelete ? (
                    <button type="button" role="menuitem" onClick={onRevoke}>
                      {messages.servers.detail.revoke}
                    </button>
                  ) : null}
                  {canDelete ? (
                    <button type="button" role="menuitem" onClick={onDelete}>
                      {messages.servers.detail.delete}
                    </button>
                  ) : null}
                </>
              ) : null}
            </AnchoredPopover>
          </div>
        </div>
      </td>
    </tr>
  );
}

function OsGlyph({ name }: { name: string | null }) {
  const os = (name ?? '').toLowerCase();
  if (os.includes('ubuntu')) {
    return <UbuntuIcon />;
  }
  if (os.includes('debian')) {
    return <DebianIcon />;
  }
  return <LinuxIcon />;
}

function MiniMeter({
  label,
  value,
  detail,
  stale,
  staleLabel,
}: {
  label: string;
  value: number | null;
  detail?: string;
  stale?: boolean;
  staleLabel?: string;
}) {
  const { messages } = useI18n();
  const tone = metricTone(value);
  const display = formatPercentCompact(value);
  const described = interpolate(messages.servers.list.usageLabel, { label, value: display });
  return (
    <div
      className={`${styles.miniMeter} ${stale ? styles.meterStale : ''}`}
      title={staleLabel ?? detail}
    >
      <strong className={tone === 'empty' ? undefined : styles[`tone-${tone}`]}>{display}</strong>
      {detail ? <small>{detail}</small> : null}
      {value === null ? (
        <span className="sr-only">{described}</span>
      ) : (
        <span
          className={styles.meterTrack}
          role="meter"
          aria-label={described}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(value)}
        >
          <span
            className={`${styles.meterFill} ${styles[`fill-${tone}`]}`}
            style={{ width: `${Math.min(100, value)}%` }}
          />
        </span>
      )}
    </div>
  );
}

export function ServerCard({
  server,
  selected,
  canDelete,
  onToggle,
  onOpen,
  onDelete,
  onRevoke,
}: Omit<ServerTableRowProps, 'active'>) {
  const { locale, messages } = useI18n();
  const copy = messages.servers.list;
  const title = server.name;
  const hasAgent = hasInstalledAgent(server);
  const spaceName = server.spaceName ?? server.groupName;

  return (
    <article
      className={`${styles.card} ${selected ? styles.cardSelected : ''}`}
      data-testid={`server-card-${server.id}`}
    >
      <div className={styles.cardTop}>
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggle}
          aria-label={interpolate(copy.selectServer, { name: title })}
        />
        <Link to={`/servers/${server.id}`} className={styles.cardMain}>
          <strong title={title}>{title}</strong>
          <span
            className={`${styles.statusBadge} ${styles[`status-${server.status.toLowerCase()}`]}`}
          >
            {messages.servers.status[server.status]}
          </span>
        </Link>
      </div>
      <p className={styles.cardMeta}>
        {server.primaryIp ?? '—'} · {spaceName ?? copy.noSpace}
      </p>
      <ServerResources
        compact
        cpu={hasAgent ? server.cpuUsagePercent : null}
        ram={hasAgent ? ratioToPercent(server.memoryUsedBytes, server.memoryTotalBytes) : null}
        disk={hasAgent ? ratioToPercent(server.diskUsedBytes, server.diskTotalBytes) : null}
      />
      <time
        dateTime={server.lastSeenAt ?? undefined}
        title={formatExactTime(server.lastSeenAt, locale)}
      >
        {formatLastSeen(server.lastSeenAt, copy.time)}
      </time>
      <div className={styles.cardActions}>
        <Link to={`/servers/${server.id}`} data-testid={`server-link-${server.id}`}>
          {copy.bulk.open}
        </Link>
        <button type="button" onClick={onOpen}>
          {copy.inspector.title}
        </button>
        {canDelete ? (
          <>
            <button type="button" onClick={onRevoke}>
              {messages.servers.detail.revoke}
            </button>
            <button type="button" onClick={onDelete}>
              {messages.servers.detail.delete}
            </button>
          </>
        ) : null}
      </div>
    </article>
  );
}
