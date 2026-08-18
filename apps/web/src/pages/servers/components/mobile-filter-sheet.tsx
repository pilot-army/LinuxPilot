import { useEffect, useRef } from 'react';
import { SERVER_STATUSES, type ServerStatus } from '@linuxpilot/server-contracts';
import { useBodyScrollLock } from '../../../features/dashboard/use-body-scroll-lock';
import { useFocusTrap } from '../../../features/dashboard/use-focus-trap';
import { AGENT_FILTERS, type AgentFilter } from '../../../features/servers/types';
import { useI18n } from '../../../i18n';
import { Button } from '../../../shared/ui/button';
import styles from '../servers-page.module.css';

type MobileFilterSheetProps = {
  open: boolean;
  status: ServerStatus | '';
  os: string;
  osOptions: string[];
  spaceId: string;
  spaces: { id: string; name: string }[];
  agent: AgentFilter;
  onStatusChange: (value: ServerStatus | '') => void;
  onOsChange: (value: string) => void;
  onSpaceChange: (value: string) => void;
  onAgentChange: (value: AgentFilter) => void;
  onApply: () => void;
  onReset: () => void;
  onClose: () => void;
};

export function MobileFilterSheet({
  open,
  status,
  os,
  osOptions,
  spaceId,
  spaces,
  agent,
  onStatusChange,
  onOsChange,
  onSpaceChange,
  onAgentChange,
  onApply,
  onReset,
  onClose,
}: MobileFilterSheetProps) {
  const { messages } = useI18n();
  const copy = messages.servers.list;
  const panelRef = useRef<HTMLDivElement>(null);
  useFocusTrap(open, panelRef);
  useBodyScrollLock(open);

  useEffect(() => {
    if (!open) {
      return;
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div className={styles.sheetRoot} data-testid="servers-filter-sheet">
      <button
        type="button"
        className={styles.sheetOverlay}
        aria-label={messages.common.actions.close}
        onClick={onClose}
      />
      <div ref={panelRef} className={styles.sheet} role="dialog" aria-label={copy.filters}>
        <h2>{copy.filters}</h2>
        <label>
          {copy.statusFilter}
          <select
            value={status}
            onChange={(event) => onStatusChange(event.target.value as ServerStatus | '')}
          >
            <option value="">{copy.allStatuses}</option>
            {Object.values(SERVER_STATUSES).map((value) => (
              <option key={value} value={value}>
                {messages.servers.status[value]}
              </option>
            ))}
          </select>
        </label>
        <label>
          {copy.osFilter}
          <select value={os} onChange={(event) => onOsChange(event.target.value)}>
            <option value="">{copy.allOs}</option>
            {osOptions.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <label>
          {copy.groupFilter}
          <select value={spaceId} onChange={(event) => onSpaceChange(event.target.value)}>
            <option value="">{copy.allGroups}</option>
            {spaces.map((space) => (
              <option key={space.id} value={space.id}>
                {space.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          {copy.agentFilter}
          <select
            value={agent}
            onChange={(event) => onAgentChange(event.target.value as AgentFilter)}
          >
            {AGENT_FILTERS.map((value) => (
              <option key={value} value={value}>
                {value === 'all'
                  ? copy.allAgents
                  : value === 'installed'
                    ? copy.agentInstalled
                    : copy.agentMissingFilter}
              </option>
            ))}
          </select>
        </label>
        <div className={styles.sheetActions}>
          <Button variant="secondary" onClick={onReset}>
            {copy.reset}
          </Button>
          <Button onClick={onApply}>{copy.apply}</Button>
        </div>
      </div>
    </div>
  );
}
