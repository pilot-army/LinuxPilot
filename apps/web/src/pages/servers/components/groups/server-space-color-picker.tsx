import { GROUP_COLOR_TOKENS, type GroupColorToken } from '@linuxpilot/server-contracts';
import { SPACE_COLOR_ORDER } from '../../../../features/groups/colors';
import styles from './create-space-dialog.module.css';

type ServerSpaceColorPickerProps = {
  value: GroupColorToken;
  labels: Record<GroupColorToken, string>;
  legend: string;
  onChange: (color: GroupColorToken) => void;
};

export function ServerSpaceColorPicker({
  value,
  labels,
  legend,
  onChange,
}: ServerSpaceColorPickerProps) {
  return (
    <div>
      <span className={styles.sectionLabel}>{legend}</span>
      <div className={styles.colorRow} role="radiogroup" aria-label={legend}>
        {SPACE_COLOR_ORDER.map((token) => {
          const selected = value === token;
          return (
            <button
              key={token}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={labels[token]}
              className={`${styles.swatch} ${selected ? styles.swatchActive : ''}`}
              style={{ background: GROUP_COLOR_TOKENS[token] }}
              onClick={() => onChange(token)}
              data-testid={`space-color-${token}`}
            >
              {selected ? <span className={styles.swatchDot} aria-hidden="true" /> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
