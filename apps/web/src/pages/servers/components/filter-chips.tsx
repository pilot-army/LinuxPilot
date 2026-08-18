import { useI18n } from '../../../i18n';
import styles from '../server-section.module.css';

export type FilterChip = {
  id: string;
  label: string;
  onClear: () => void;
};

type ActiveFilterChipsProps = {
  chips: FilterChip[];
  testId?: string;
  onClearAll: () => void;
};

export function FilterChips({ chips, testId, onClearAll }: ActiveFilterChipsProps) {
  const { messages } = useI18n();
  if (chips.length === 0) {
    return null;
  }
  return (
    <div className={styles.chips} data-testid={testId}>
      {chips.map((chip) => (
        <button key={chip.id} type="button" className={styles.chip} onClick={chip.onClear}>
          {chip.label} ×
        </button>
      ))}
      <button type="button" className={styles.clearFilters} onClick={onClearAll}>
        {messages.servers.list.clearFilters}
      </button>
    </div>
  );
}
