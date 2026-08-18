import { GridIcon, ListIcon } from '../../../features/dashboard/icons';
import styles from '../server-section.module.css';

type ViewToggleProps<T extends string> = {
  value: T;
  options: Array<{ id: T; label: string; icon: 'table' | 'grid' }>;
  label: string;
  onChange: (value: T) => void;
};

export function ViewToggle<T extends string>({ value, options, label, onChange }: ViewToggleProps<T>) {
  return (
    <div className={styles.layoutToggle} role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          className={value === option.id ? styles.layoutActive : undefined}
          aria-pressed={value === option.id}
          aria-label={option.label}
          data-testid={`layout-${option.id}`}
          onClick={() => onChange(option.id)}
        >
          {option.icon === 'grid' ? <GridIcon /> : <ListIcon />}
        </button>
      ))}
    </div>
  );
}
