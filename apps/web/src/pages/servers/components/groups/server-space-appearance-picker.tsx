import { ServerSpaceColorPicker } from './server-space-color-picker';
import { ServerSpaceIconPicker } from './server-space-icon-picker';
import type { GroupColorToken, ServerSpaceIcon } from '@linuxpilot/server-contracts';
import styles from './create-space-dialog.module.css';

type ServerSpaceAppearancePickerProps = {
  icon: ServerSpaceIcon;
  color: GroupColorToken;
  title: string;
  iconLegend: string;
  colorLegend: string;
  iconLabels: Record<ServerSpaceIcon, string>;
  colorLabels: Record<GroupColorToken, string>;
  onIconChange: (icon: ServerSpaceIcon) => void;
  onColorChange: (color: GroupColorToken) => void;
};

export function ServerSpaceAppearancePicker({
  icon,
  color,
  title,
  iconLegend,
  colorLegend,
  iconLabels,
  colorLabels,
  onIconChange,
  onColorChange,
}: ServerSpaceAppearancePickerProps) {
  return (
    <fieldset className={styles.appearance}>
      <legend className={styles.sectionLabel}>{title}</legend>
      <ServerSpaceIconPicker
        value={icon}
        labels={iconLabels}
        legend={iconLegend}
        onChange={onIconChange}
      />
      <ServerSpaceColorPicker
        value={color}
        labels={colorLabels}
        legend={colorLegend}
        onChange={onColorChange}
      />
    </fieldset>
  );
}
