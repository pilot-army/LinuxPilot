import { FilterIcon, SearchIcon } from '../../../features/dashboard/icons';
import { interpolate } from '../../../features/dashboard/format';
import { SERVER_FILTERS, type ServerFilter } from '../../../features/dashboard/types';
import { useI18n } from '../../../i18n';
import styles from '../dashboard-page.module.css';

type ServerFiltersProps = {
  query: string;
  filter: ServerFilter;
  counts: Record<ServerFilter, number>;
  onQueryChange: (value: string) => void;
  onFilterChange: (value: ServerFilter) => void;
};

export function ServerFilters({
  query,
  filter,
  counts,
  onQueryChange,
  onFilterChange,
}: ServerFiltersProps) {
  const { messages } = useI18n();
  const copy = messages.dashboard.servers;

  return (
    <div className={styles.serverToolbar}>
      <label className={styles.serverSearch}>
        <span className="sr-only">{copy.searchLabel}</span>
        <SearchIcon className={styles.searchIcon} />
        <input
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder={copy.search}
          data-testid="dashboard-server-search"
        />
      </label>
      <div className={styles.serverFilterRow}>
        <span className={styles.filterGlyph} aria-hidden="true">
          <FilterIcon />
        </span>
        <div
          className={styles.serverTabs}
          role="tablist"
          aria-label={messages.dashboard.actions.openFilters}
        >
          {SERVER_FILTERS.map((value) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={filter === value}
              className={
                filter === value
                  ? `${styles.serverTab} ${styles.serverTabActive}`
                  : styles.serverTab
              }
              data-testid={`dashboard-server-filter-${value}`}
              onClick={() => onFilterChange(value)}
            >
              {interpolate(copy.filters[value], { count: counts[value] })}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
