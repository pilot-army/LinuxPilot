import { useState } from 'react';
import type { ServerSpace } from '@linuxpilot/server-contracts';
import { CloseIcon } from '../../../../../features/dashboard/icons';
import { interpolate } from '../../../../../features/servers/format';
import { canAddTag, parseTagCandidate } from '../../../../../features/enrollment/validation';
import type { FieldErrors, WizardForm } from '../../../../../features/enrollment/types';
import { useI18n } from '../../../../../i18n';
import { SpaceSelect } from './space-select';
import styles from '../enrollment-wizard.module.css';

export const WIZARD_TAG_LIMIT = 10;

type GroupAndTagsStepProps = {
  form: WizardForm;
  errors: FieldErrors;
  spaces: ServerSpace[];
  spacesStatus: 'loading' | 'success' | 'error';
  onChange: <K extends keyof WizardForm>(key: K, value: WizardForm[K]) => void;
  onTagError: (error?: string) => void;
  onCreatedSpace: (id: string) => void;
  onRetrySpaces: () => void | Promise<unknown>;
};

export function GroupAndTagsStep({
  form,
  errors,
  spaces,
  spacesStatus,
  onChange,
  onTagError,
  onCreatedSpace,
  onRetrySpaces,
}: GroupAndTagsStepProps) {
  const { messages } = useI18n();
  const copy = messages.servers.create;
  const [draft, setDraft] = useState('');
  const [pendingRemove, setPendingRemove] = useState<string | null>(null);
  const tagsAtLimit = form.tags.length >= WIZARD_TAG_LIMIT;

  function addTag(raw: string) {
    const parsed = parseTagCandidate(raw, copy);
    const tag = parsed.tag;
    if (!tag) {
      if (parsed.error) {
        onTagError(parsed.error);
      }
      return;
    }
    const duplicate = form.tags.some((item) => item.toLowerCase() === tag.toLowerCase());
    if (duplicate) {
      onTagError(copy.tagDuplicate);
      return;
    }
    if (form.tags.length >= WIZARD_TAG_LIMIT) {
      onTagError(copy.tagsLimit);
      return;
    }
    const limit = canAddTag(form.tags, tag, copy);
    if (limit) {
      onTagError(limit);
      return;
    }
    onTagError(undefined);
    onChange('tags', [...form.tags, tag]);
    setDraft('');
    setPendingRemove(null);
  }

  function removeTag(tag: string) {
    onChange(
      'tags',
      form.tags.filter((item) => item !== tag),
    );
    if (pendingRemove === tag) {
      setPendingRemove(null);
    }
    onTagError(undefined);
  }

  return (
    <div className={styles.groupTagsStep}>
      <SpaceSelect
        spaceId={form.spaceId}
        spaces={spaces}
        spacesStatus={spacesStatus}
        onChange={(spaceId) => onChange('spaceId', spaceId)}
        onCreatedSpace={onCreatedSpace}
        onRetrySpaces={onRetrySpaces}
      />

      <div className={styles.tagsSection}>
        <label className={styles.fieldLabel} htmlFor="enrollment-tag-input">
          <span>{copy.tagsLabel}</span>
          <span className={styles.optionalBadge}>{copy.optionalBadge}</span>
        </label>
        <div
          className={`${styles.tagField} ${errors.tags ? styles.tagFieldInvalid : ''}`}
          data-testid="tag-field"
        >
          <div className={styles.tagFieldMain}>
            {form.tags.map((tag) => (
              <span
                key={tag}
                className={`${styles.tagChip} ${pendingRemove === tag ? styles.tagChipPending : ''}`}
                data-testid={`tag-chip-${tag}`}
              >
                {tag}
                <button
                  type="button"
                  className={styles.tagChipRemove}
                  aria-label={interpolate(copy.removeTag, { tag })}
                  onClick={() => removeTag(tag)}
                >
                  <CloseIcon />
                </button>
              </span>
            ))}
            <input
              id="enrollment-tag-input"
              className={styles.tagInput}
              value={draft}
              placeholder={tagsAtLimit ? undefined : copy.tagsPlaceholder}
              disabled={tagsAtLimit}
              aria-invalid={Boolean(errors.tags)}
              aria-describedby={errors.tags ? 'enrollment-tags-error' : 'enrollment-tags-hint'}
              data-testid="tag-input"
              onChange={(event) => {
                setDraft(event.target.value);
                setPendingRemove(null);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ',') {
                  event.preventDefault();
                  addTag(draft);
                  return;
                }
                if (event.key === 'Backspace' && draft === '' && form.tags.length > 0) {
                  event.preventDefault();
                  const last = form.tags[form.tags.length - 1];
                  if (!last) {
                    return;
                  }
                  if (pendingRemove === last) {
                    removeTag(last);
                  } else {
                    setPendingRemove(last);
                  }
                }
              }}
              onBlur={() => addTag(draft)}
            />
          </div>
          <span className={styles.tagCounter} data-testid="tag-counter">
            {form.tags.length} / {WIZARD_TAG_LIMIT}
          </span>
        </div>
        {errors.tags ? (
          <span id="enrollment-tags-error" role="alert" className={styles.tagError}>
            {errors.tags}
          </span>
        ) : (
          <span id="enrollment-tags-hint" className={styles.hint}>
            {copy.tagsHintLong}
          </span>
        )}
      </div>
    </div>
  );
}
