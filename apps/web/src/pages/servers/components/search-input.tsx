import { SearchIcon } from '../../../features/dashboard/icons';
import styles from '../server-section.module.css';

type SearchInputProps = {
  value: string;
  placeholder: string;
  label: string;
  testId?: string;
  onChange: (value: string) => void;
};

export function SearchInput({ value, placeholder, label, testId, onChange }: SearchInputProps) {
  return (
    <label className={styles.search}>
      <span className="sr-only">{label}</span>
      <SearchIcon className={styles.searchIcon} />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        data-testid={testId}
      />
    </label>
  );
}
