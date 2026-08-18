import { FilterIcon, GridIcon, ListIcon, SearchIcon } from '../../../../features/dashboard/icons';
import {
  GROUP_FILTERS,
  GROUP_SORTS,
  type GroupFilter,
  type GroupLayout,
  type GroupSort,
} from '../../../../features/groups/types';
import { useI18n } from '../../../../i18n';
import styles from '../../server-groups-page.module.css';

type GroupsToolbarProps = {
  q: string;
  filter: GroupFilter;
  tag: string;
  tags: string[];
  sort: GroupSort;
  layout: GroupLayout;
  onQueryChange: (value: string) => void;
  onFilterChange: (value: GroupFilter) => void;
  onTagChange: (value: string) => void;
  onSortChange: (value: GroupSort) => void;
  onLayoutChange: (value: GroupLayout) => void;
  onOpenMobileFilters: () => void;
};

export function GroupsToolbar({
  q,
  filter,
  tag,
  tags,
  sort,
  layout,
  onQueryChange,
  onFilterChange,
  onTagChange,
  onSortChange,
  onLayoutChange,
  onOpenMobileFilters,
}: GroupsToolbarProps) {
  const { messages } = useI18n();
  const copy = messages.servers.groups;

  return (
    <div className={styles.toolbar}>
      <label className={styles.search}>
        <span className="sr-only">{copy.searchLabel}</span>
        <SearchIcon className={styles.searchIcon} />
        <input
          type="search"
          value={q}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder={copy.search}
          data-testid="groups-search"
        />
      </label>
      <button
        type="button"
        className={styles.mobileFilters}
        onClick={onOpenMobileFilters}
        data-testid="groups-open-filters"
      >
        <FilterIcon />
        {messages.servers.list.filters}
      </button>
      <div className={styles.desktopFilters}>
        <label>
          <span className="sr-only">{copy.allStates}</span>
          <select
            value={filter}
            onChange={(event) => onFilterChange(event.target.value as GroupFilter)}
            data-testid="groups-filter"
          >
            {GROUP_FILTERS.map((value) => (
              <option key={value} value={value}>
                {copy.filter[value]}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="sr-only">{copy.tagFilter}</span>
          <select
            value={tag}
            onChange={(event) => onTagChange(event.target.value)}
            data-testid="groups-tag"
          >
            <option value="">{copy.allTags}</option>
            {tags.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="sr-only">{copy.sort.name}</span>
          <select
            value={sort}
            onChange={(event) => onSortChange(event.target.value as GroupSort)}
            data-testid="groups-sort"
          >
            {GROUP_SORTS.map((value) => (
              <option key={value} value={value}>
                {copy.sort[value]}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className={styles.layoutToggle} role="group" aria-label={copy.layoutGrid}>
        <button
          type="button"
          className={layout === 'grid' ? styles.layoutActive : undefined}
          aria-pressed={layout === 'grid'}
          aria-label={copy.layoutGrid}
          data-testid="groups-layout-grid"
          onClick={() => onLayoutChange('grid')}
        >
          <GridIcon />
        </button>
        <button
          type="button"
          className={layout === 'list' ? styles.layoutActive : undefined}
          aria-pressed={layout === 'list'}
          aria-label={copy.layoutList}
          data-testid="groups-layout-list"
          onClick={() => onLayoutChange('list')}
        >
          <ListIcon />
        </button>
      </div>
    </div>
  );
}
