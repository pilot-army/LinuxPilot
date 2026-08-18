import { GROUP_COLOR_TOKENS, type GroupColorToken } from '@linuxpilot/server-contracts';
import { GROUP_COLOR_ORDER } from '../../../../features/groups/colors';
import { useI18n } from '../../../../i18n';
import { TextField } from '../../../../shared/ui/text-field';
import styles from '../../server-groups-page.module.css';

export type GroupFormValue = {
  name: string;
  slug: string;
  description: string;
  color: GroupColorToken;
  tags: string;
  notificationsEnabled: boolean;
};

type GroupFormFieldsProps = {
  value: GroupFormValue;
  errors: Partial<Record<keyof GroupFormValue, string>>;
  onChange: (value: GroupFormValue) => void;
};

export function GroupFormFields({ value, errors, onChange }: GroupFormFieldsProps) {
  const { messages } = useI18n();
  const copy = messages.servers.groups;

  return (
    <div className={styles.dialogBody}>
      <TextField
        name="group-name"
        label={copy.name}
        value={value.name}
        error={errors.name}
        onChange={(event) => onChange({ ...value, name: event.target.value })}
        data-testid="group-name"
      />
      <TextField
        name="group-slug"
        label={copy.slug}
        hint={copy.slugHint}
        value={value.slug}
        error={errors.slug}
        onChange={(event) => onChange({ ...value, slug: event.target.value })}
        data-testid="group-slug"
      />
      <TextField
        name="group-description"
        label={copy.description}
        value={value.description}
        onChange={(event) => onChange({ ...value, description: event.target.value })}
        data-testid="group-description"
      />
      <fieldset>
        <legend>{copy.color}</legend>
        <div className={styles.colorSwatches} role="radiogroup" aria-label={copy.color}>
          {GROUP_COLOR_ORDER.map((token) => (
            <button
              key={token}
              type="button"
              role="radio"
              aria-checked={value.color === token}
              aria-label={copy.colors[token]}
              className={`${styles.swatch} ${value.color === token ? styles.swatchActive : ''}`}
              style={{ background: GROUP_COLOR_TOKENS[token] }}
              onClick={() => onChange({ ...value, color: token })}
            />
          ))}
        </div>
      </fieldset>
      <TextField
        name="group-tags"
        label={copy.tags}
        hint={copy.tagsHint}
        value={value.tags}
        onChange={(event) => onChange({ ...value, tags: event.target.value })}
        data-testid="group-tags"
      />
      <label>
        <input
          type="checkbox"
          checked={value.notificationsEnabled}
          onChange={(event) => onChange({ ...value, notificationsEnabled: event.target.checked })}
          data-testid="group-notifications"
        />
        {copy.notifications}
      </label>
    </div>
  );
}

const NAME_PATTERN = /^[\p{L}\p{N}][\p{L}\p{N} ._-]{0,79}$/u;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function validateGroupForm(
  value: GroupFormValue,
  copy: { nameRequired: string; nameInvalid: string; slugInvalid?: string },
): Partial<Record<keyof GroupFormValue, string>> {
  const errors: Partial<Record<keyof GroupFormValue, string>> = {};
  const name = value.name.trim();
  if (!name) {
    errors.name = copy.nameRequired;
  } else if (!NAME_PATTERN.test(name)) {
    errors.name = copy.nameInvalid;
  }
  const slug = value.slug.trim().toLowerCase();
  if (slug && !SLUG_PATTERN.test(slug)) {
    errors.slug = copy.slugInvalid ?? copy.nameInvalid;
  }
  return errors;
}

export function parseTagInput(value: string): string[] {
  return value
    .split(',')
    .map((tag) => tag.trim().toLowerCase())
    .filter(Boolean);
}
