import { SERVER_STATUSES, type ServerStatus } from '@linuxpilot/server-contracts';
import type { AgentFilter } from '../../../features/servers/types';
import { interpolate } from '../../../features/servers/format';
import { useI18n } from '../../../i18n';
import styles from '../servers-page.module.css';

type ActiveFilterChipsProps = {
  q: string;
  status: ServerStatus | '';
  os: string;
  groupId: string;
  groupName: string;
  agent: AgentFilter;
  onClearQ: () => void;
  onClearStatus: () => void;
  onClearOs: () => void;
  onClearGroup: () => void;
  onClearAgent: () => void;
  onClearAll: () => void;
};

export function ActiveFilterChips({
  q,
  status,
  os,
  groupId,
  groupName,
  agent,
  onClearQ,
  onClearStatus,
  onClearOs,
  onClearGroup,
  onClearAgent,
  onClearAll,
}: ActiveFilterChipsProps) {
  const { messages } = useI18n();
  const copy = messages.servers.list;
  if (!q && !status && !os && !groupId && agent === 'all') {
    return null;
  }

  return (
    <div className={styles.chips} data-testid="servers-chips">
      {q ? (
        <button type="button" className={styles.chip} onClick={onClearQ}>
          {interpolate(copy.chips.search, { value: q })} ×
        </button>
      ) : null}
      {status ? (
        <button type="button" className={styles.chip} onClick={onClearStatus}>
          {interpolate(copy.chips.status, { value: messages.servers.status[status] })} ×
        </button>
      ) : null}
      {os ? (
        <button type="button" className={styles.chip} onClick={onClearOs}>
          {interpolate(copy.chips.os, { value: os })} ×
        </button>
      ) : null}
      {groupId ? (
        <button type="button" className={styles.chip} onClick={onClearGroup}>
          {interpolate(copy.chips.group, { value: groupName || groupId })} ×
        </button>
      ) : null}
      {agent !== 'all' ? (
        <button type="button" className={styles.chip} onClick={onClearAgent}>
          {interpolate(copy.chips.agent, {
            value: agent === 'installed' ? copy.agentInstalled : copy.agentMissingFilter,
          })}{' '}
          ×
        </button>
      ) : null}
      <button type="button" className={styles.clearFilters} onClick={onClearAll}>
        {copy.clearFilters}
      </button>
    </div>
  );
}

export { SERVER_STATUSES };
