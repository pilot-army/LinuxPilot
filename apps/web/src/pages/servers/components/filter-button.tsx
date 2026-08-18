import { FilterIcon } from '../../../features/dashboard/icons';
import { useI18n } from '../../../i18n';
import styles from '../server-section.module.css';

type FilterButtonProps = {
  onClick: () => void;
  testId?: string;
};

export function FilterButton({ onClick, testId }: FilterButtonProps) {
  const { messages } = useI18n();
  return (
    <button type="button" className={styles.mobileFilters} onClick={onClick} data-testid={testId}>
      <FilterIcon />
      {messages.servers.list.filters}
    </button>
  );
}
