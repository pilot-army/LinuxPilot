import { SPACE_ICONS, type ServerSpaceIcon } from '@linuxpilot/server-contracts';
import { SPACE_ICON_COMPONENTS } from '../../../../features/groups/space-icons';
import styles from './create-space-dialog.module.css';

type ServerSpaceIconPickerProps = {
  value: ServerSpaceIcon;
  labels: Record<ServerSpaceIcon, string>;
  legend: string;
  onChange: (icon: ServerSpaceIcon) => void;
};

export function ServerSpaceIconPicker({
  value,
  labels,
  legend,
  onChange,
}: ServerSpaceIconPickerProps) {
  return (
    <div>
      <span className={styles.sectionLabel}>{legend}</span>
      <div className={styles.iconRow} role="radiogroup" aria-label={legend}>
        {SPACE_ICONS.map((icon) => {
          const Icon = SPACE_ICON_COMPONENTS[icon] ?? SPACE_ICON_COMPONENTS.server;
          const selected = value === icon;
          return (
            <button
              key={icon}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={labels[icon]}
              className={`${styles.iconButton} ${selected ? styles.iconButtonActive : ''}`}
              onClick={() => onChange(icon)}
              data-testid={`space-icon-${icon}`}
            >
              <Icon />
            </button>
          );
        })}
      </div>
    </div>
  );
}
