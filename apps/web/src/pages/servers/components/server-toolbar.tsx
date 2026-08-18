import { SERVER_STATUSES, type ServerStatus } from '@linuxpilot/server-contracts';
import { FilterIcon, SearchIcon } from '../../../features/dashboard/icons';
import { AGENT_FILTERS, type AgentFilter, type ServerLayout } from '../../../features/servers/types';
import { useI18n } from '../../../i18n';
import { ViewToggle } from './view-toggle';
import styles from '../servers-page.module.css';

type ServerToolbarProps = {
  q: string;
  status: ServerStatus | '';
  os: string;
  osOptions: string[];
  spaceId: string;
  spaces: { id: string; name: string }[];
  agent: AgentFilter;
  layout: ServerLayout;
  canReset: boolean;
  filterCount: number;
  onQueryChange: (value: string) => void;
  onStatusChange: (value: ServerStatus | '') => void;
  onOsChange: (value: string) => void;
  onSpaceChange: (value: string) => void;
  onAgentChange: (value: AgentFilter) => void;
  onLayoutChange: (value: ServerLayout) => void;
  onReset: () => void;
  onOpenFilters: () => void;
};

export function ServerToolbar({
  q,
  status,
  os,
  osOptions,
  spaceId,
  spaces,
  agent,
  layout,
  canReset,
  filterCount,
  onQueryChange,
  onStatusChange,
  onOsChange,
  onSpaceChange,
  onAgentChange,
  onLayoutChange,
  onReset,
  onOpenFilters,
}: ServerToolbarProps) {
  const { messages } = useI18n();
  const copy = messages.servers.list;

  return (
    <div className={styles.toolbar}>
      <label className={styles.search}>
        <span className="sr-only">{copy.searchLabel}</span>
        <SearchIcon className={styles.searchIcon} />
        <input
          type="search"
          value={q}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder={copy.searchPlaceholder}
          data-testid="servers-search"
        />
      </label>
      <div className={styles.desktopFilters}>
        <label>
          <span className="sr-only">{copy.statusFilter}</span>
          <select
            value={status}
            onChange={(event) => onStatusChange(event.target.value as ServerStatus | '')}
            data-testid="servers-status-filter"
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
          <span className="sr-only">{copy.osFilter}</span>
          <select
            value={os}
            onChange={(event) => onOsChange(event.target.value)}
            data-testid="servers-os-filter"
          >
            <option value="">{copy.allOs}</option>
            {osOptions.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="sr-only">{copy.groupFilter}</span>
          <select
            value={spaceId}
            onChange={(event) => onSpaceChange(event.target.value)}
            data-testid="servers-space-filter"
          >
            <option value="">{copy.allGroups}</option>
            {spaces.map((space) => (
              <option key={space.id} value={space.id}>
                {space.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="sr-only">{copy.agentFilter}</span>
          <select
            value={agent}
            onChange={(event) => onAgentChange(event.target.value as AgentFilter)}
            data-testid="servers-agent-filter"
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
      </div>
      <button
        type="button"
        className={styles.filtersButton}
        onClick={onOpenFilters}
        data-testid="servers-open-filters"
      >
        <FilterIcon />
        {copy.filters}
        {filterCount > 0 ? <span className={styles.filterBadge}>{filterCount}</span> : null}
      </button>
      <button
        type="button"
        className={styles.clearFilters}
        disabled={!canReset}
        data-testid="servers-reset-filters"
        onClick={onReset}
      >
        {copy.reset}
      </button>
      <ViewToggle
        value={layout}
        label={copy.layoutTable}
        onChange={onLayoutChange}
        options={[
          { id: 'table', label: copy.layoutTable, icon: 'table' },
          { id: 'grid', label: copy.layoutGrid, icon: 'grid' },
        ]}
      />
    </div>
  );
}
