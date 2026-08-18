import { useEffect, useRef } from 'react';
import { useBodyScrollLock } from '../../../../features/dashboard/use-body-scroll-lock';
import { useFocusTrap } from '../../../../features/dashboard/use-focus-trap';
import {
  GROUP_FILTERS,
  GROUP_SORTS,
  type GroupFilter,
  type GroupSort,
} from '../../../../features/groups/types';
import { useI18n } from '../../../../i18n';
import { Button } from '../../../../shared/ui/button';
import styles from '../../server-groups-page.module.css';

type MobileGroupsFilterSheetProps = {
  open: boolean;
  filter: GroupFilter;
  tag: string;
  tags: string[];
  sort: GroupSort;
  onFilterChange: (value: GroupFilter) => void;
  onTagChange: (value: string) => void;
  onSortChange: (value: GroupSort) => void;
  onApply: () => void;
  onReset: () => void;
  onClose: () => void;
};

export function MobileGroupsFilterSheet({
  open,
  filter,
  tag,
  tags,
  sort,
  onFilterChange,
  onTagChange,
  onSortChange,
  onApply,
  onReset,
  onClose,
}: MobileGroupsFilterSheetProps) {
  const { messages } = useI18n();
  const copy = messages.servers.groups;
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
    <div data-testid="groups-filter-sheet">
      <button
        type="button"
        className={styles.sheetOverlay}
        aria-label={messages.common.actions.close}
        onClick={onClose}
      />
      <div
        ref={panelRef}
        className={styles.sheet}
        role="dialog"
        aria-label={messages.servers.list.filters}
      >
        <h2>{messages.servers.list.filters}</h2>
        <label>
          {copy.allStates}
          <select
            value={filter}
            onChange={(event) => onFilterChange(event.target.value as GroupFilter)}
          >
            {GROUP_FILTERS.map((value) => (
              <option key={value} value={value}>
                {copy.filter[value]}
              </option>
            ))}
          </select>
        </label>
        <label>
          {copy.tagFilter}
          <select value={tag} onChange={(event) => onTagChange(event.target.value)}>
            <option value="">{copy.allTags}</option>
            {tags.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <label>
          {copy.sort.name}
          <select value={sort} onChange={(event) => onSortChange(event.target.value as GroupSort)}>
            {GROUP_SORTS.map((value) => (
              <option key={value} value={value}>
                {copy.sort[value]}
              </option>
            ))}
          </select>
        </label>
        <div className={styles.dialogActions}>
          <Button variant="secondary" onClick={onReset}>
            {messages.servers.list.reset}
          </Button>
          <Button onClick={onApply}>{messages.servers.list.apply}</Button>
        </div>
      </div>
    </div>
  );
}
