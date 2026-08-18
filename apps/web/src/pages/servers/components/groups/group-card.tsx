import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { ServerGroup } from '@linuxpilot/server-contracts';
import { MoreIcon } from '../../../../features/dashboard/icons';
import { hexToGroupToken } from '../../../../features/groups/colors';
import { spacePath } from '../../../../features/groups/space-path';
import { SpaceIcon } from '../../../../features/groups/space-icons';
import { formatLastSeen, formatPercent, interpolate } from '../../../../features/servers/format';
import { metricTone } from '../../../../features/servers/compute';
import { useI18n } from '../../../../i18n';
import { GroupStatusBar } from './group-status-bar';
import styles from '../../server-groups-page.module.css';

type GroupCardProps = {
  group: ServerGroup;
  selected: boolean;
  checked: boolean;
  canManage: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onAssign: () => void;
  onDelete: () => void;
  onRunOperation: () => void;
};

export function GroupCard({
  group,
  selected,
  checked,
  canManage,
  onToggle,
  onEdit,
  onAssign,
  onDelete,
  onRunOperation,
}: GroupCardProps) {
  const { messages } = useI18n();
  const copy = messages.servers.groups;
  const [menuOpen, setMenuOpen] = useState(false);
  const token = hexToGroupToken(group.color);
  const visibleTags = group.tags.slice(0, 2);
  const extraTags = group.tags.length - visibleTags.length;
  const href = spacePath(group);

  return (
    <article
      className={`${styles.card} ${selected ? styles.cardSelected : ''}`}
      style={{ ['--group-color' as string]: group.color }}
      aria-selected={selected}
      data-testid={`group-card-${group.id}`}
    >
      <Link
        to={href}
        className={styles.cardHit}
        aria-label={interpolate(copy.openGroup, { name: group.name })}
      />
      <div className={styles.cardTop}>
        <div className={styles.cardMain}>
          <input
            type="checkbox"
            checked={checked}
            onChange={onToggle}
            onClick={(event) => event.stopPropagation()}
            aria-label={interpolate(copy.selectGroup, { name: group.name })}
          />
          <span className={styles.folder} aria-hidden="true">
            <SpaceIcon icon={group.icon} />
          </span>
          <div className={styles.cardTitle}>
            <strong>{group.name}</strong>
            <p>{group.description || '—'}</p>
          </div>
        </div>
        <div className={styles.menuWrap}>
          <button
            type="button"
            className={styles.iconAction}
            aria-label={copy.moreActions}
            aria-expanded={menuOpen}
            data-testid={`group-menu-${group.id}`}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setMenuOpen((open) => !open);
            }}
          >
            <MoreIcon />
          </button>
          {menuOpen ? (
            <div className={styles.menuPopover} role="menu">
              <Link
                to={href}
                role="menuitem"
                onClick={() => setMenuOpen(false)}
              >
                {copy.open}
              </Link>
              {canManage ? (
                <>
                  <button
                    type="button"
                    data-testid={`group-assign-${group.id}`}
                    onClick={() => {
                      setMenuOpen(false);
                      onAssign();
                    }}
                  >
                    {copy.addServers}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onRunOperation();
                    }}
                  >
                    {copy.runOperation}
                  </button>
                  <button
                    type="button"
                    data-testid={`group-edit-${group.id}`}
                    onClick={() => {
                      setMenuOpen(false);
                      onEdit();
                    }}
                  >
                    {copy.edit}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onDelete();
                    }}
                  >
                    {copy.delete}
                  </button>
                </>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
      {group.tags.length > 0 ? (
        <div className={styles.tags}>
          {visibleTags.map((tag) => (
            <span
              key={tag}
              className={`${styles.tag} ${tag === 'critical' ? styles.tagCritical : styles.tagAccent}`}
            >
              {tag}
            </span>
          ))}
          {extraTags > 0 ? <span className={styles.tag}>+{extraTags}</span> : null}
        </div>
      ) : null}
      <div className={styles.statRow}>
        <span>{interpolate(copy.serversCount, { count: group.serverCount })}</span>
        <span>{interpolate(copy.onlineCount, { count: group.onlineCount })}</span>
        {group.warningCount > 0 ? (
          <span>{interpolate(copy.warningCount, { count: group.warningCount })}</span>
        ) : null}
        {group.offlineCount > 0 ? (
          <span>{interpolate(copy.offlineCount, { count: group.offlineCount })}</span>
        ) : null}
        {group.withoutAgentCount > 0 ? (
          <span>{interpolate(copy.withoutAgentCount, { count: group.withoutAgentCount })}</span>
        ) : null}
      </div>
      <GroupStatusBar group={group} />
      {group.memberNames.length > 0 ? (
        <p className={styles.meta}>{group.memberNames.slice(0, 5).join(' · ')}</p>
      ) : null}
      <div className={styles.resourceRow}>
        <Meter label={copy.avgCpu} value={group.averageCpuPercent} />
        <Meter label={copy.avgRam} value={group.averageMemoryPercent} />
        <Meter label={copy.avgDisk} value={group.averageDiskPercent} />
      </div>
      <div className={styles.cardFooter}>
        <span className={styles.meta}>
          {copy.lastChange}: {formatLastSeen(group.updatedAt, messages.servers.list.time)}
        </span>
        <Link to={href} className={styles.openLink} data-testid={`group-open-${group.id}`}>
          {copy.open}
        </Link>
      </div>
      <span className="sr-only">{token}</span>
    </article>
  );
}

function Meter({ label, value }: { label: string; value: number | null }) {
  const tone = metricTone(value);
  return (
    <div className={styles.meter}>
      <div className={styles.meterHead}>
        <span>{label}</span>
        <strong className={styles[`tone-${tone}`]}>{formatPercent(value)}</strong>
      </div>
      {value === null ? null : (
        <div className={styles.meterTrack} aria-hidden="true">
          <span
            className={`${styles.meterFill} ${styles[`fill-${tone}`]}`}
            style={{ width: `${Math.min(100, value)}%` }}
          />
        </div>
      )}
    </div>
  );
}
