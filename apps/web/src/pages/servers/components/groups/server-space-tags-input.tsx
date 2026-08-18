import { useMemo, useState, type KeyboardEvent } from 'react';
import { CloseIcon } from '../../../../features/dashboard/icons';
import { addSpaceTags } from '../../../../features/groups/space-form';
import styles from './create-space-dialog.module.css';

type ServerSpaceTagsInputProps = {
  tags: string[];
  suggestions: string[];
  label: string;
  hint: string;
  error?: string;
  onChange: (tags: string[]) => void;
  onError: (error?: string) => void;
  invalidMessage: string;
  limitMessage: string;
};

export function ServerSpaceTagsInput({
  tags,
  suggestions,
  label,
  hint,
  error,
  onChange,
  onError,
  invalidMessage,
  limitMessage,
}: ServerSpaceTagsInputProps) {
  const [draft, setDraft] = useState('');
  const matches = useMemo(() => {
    const needle = draft.trim().toLowerCase();
    if (!needle) {
      return [];
    }
    return suggestions
      .filter((item) => !tags.includes(item) && item.toLowerCase().includes(needle))
      .slice(0, 6);
  }, [draft, suggestions, tags]);

  function commit(raw: string) {
    const result = addSpaceTags(tags, raw);
    onChange(result.tags);
    if (result.limit) {
      onError(limitMessage);
    } else if (result.invalid) {
      onError(invalidMessage);
    } else {
      onError(undefined);
    }
    setDraft('');
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      commit(draft);
      return;
    }
    if (event.key === 'Backspace' && !draft && tags.length > 0) {
      onChange(tags.slice(0, -1));
    }
  }

  return (
    <div>
      <span className={styles.sectionLabel} id="space-tags-label">
        {label}
      </span>
      <div className={styles.tagsBox}>
        {tags.map((tag) => (
          <span key={tag} className={styles.chip} data-testid={`space-tag-${tag}`}>
            {tag}
            <button
              type="button"
              className={styles.chipRemove}
              aria-label={`${tag}`}
              onClick={() => onChange(tags.filter((item) => item !== tag))}
            >
              <CloseIcon width={12} height={12} />
            </button>
          </span>
        ))}
        <input
          className={styles.tagInput}
          value={draft}
          onChange={(event) => {
            const next = event.target.value;
            if (next.includes(',')) {
              commit(next);
              return;
            }
            setDraft(next);
          }}
          onKeyDown={onKeyDown}
          onBlur={() => {
            if (draft.trim()) {
              commit(draft);
            }
          }}
          aria-labelledby="space-tags-label"
          aria-describedby={error ? 'space-tags-error' : 'space-tags-hint'}
          aria-invalid={Boolean(error)}
          data-testid="group-tags"
        />
      </div>
      {error ? (
        <p className={styles.fieldError} id="space-tags-error" role="alert">
          {error}
        </p>
      ) : (
        <p className={styles.hint} id="space-tags-hint">
          {hint}
        </p>
      )}
      {matches.length > 0 ? (
        <div className={styles.suggestions}>
          {matches.map((item) => (
            <button
              key={item}
              type="button"
              className={styles.suggestion}
              onClick={() => commit(item)}
            >
              {item}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
