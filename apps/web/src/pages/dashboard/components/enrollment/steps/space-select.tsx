import { useEffect, useId, useRef, useState } from 'react';
import { PERMISSIONS } from '@linuxpilot/auth-contracts';
import type { ServerSpace } from '@linuxpilot/server-contracts';
import { usePermission } from '../../../../../auth/use-permission';
import {
  ChevronIcon,
  FolderIcon,
  PlusIcon,
  RefreshIcon,
  WarningIcon,
} from '../../../../../features/dashboard/icons';
import { interpolate } from '../../../../../features/servers/format';
import { useI18n } from '../../../../../i18n';
import { Button } from '../../../../../shared/ui/button';
import { CreateServerSpaceDialog } from '../../../../servers/components/groups/create-group-dialog';
import styles from '../enrollment-wizard.module.css';

type SpaceSelectProps = {
  spaceId: string;
  spaces: ServerSpace[];
  spacesStatus: 'loading' | 'success' | 'error';
  onChange: (spaceId: string) => void;
  onCreatedSpace: (id: string) => void;
  onRetrySpaces: () => void | Promise<unknown>;
};

export function SpaceSelect({
  spaceId,
  spaces,
  spacesStatus,
  onChange,
  onCreatedSpace,
  onRetrySpaces,
}: SpaceSelectProps) {
  const { messages } = useI18n();
  const copy = messages.servers.create;
  const canCreateSpace = usePermission(PERMISSIONS.SERVERS_UPDATE);
  const listboxId = useId();
  const selectRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [spaceQuery, setSpaceQuery] = useState('');
  const [retrying, setRetrying] = useState(false);

  const selected = spaces.find((space) => space.id === spaceId);
  const visibleSpaces = spaces.filter((space) => {
    const needle = spaceQuery.trim().toLowerCase();
    if (!needle) {
      return true;
    }
    return (
      space.name.toLowerCase().includes(needle) ||
      space.slug?.toLowerCase().includes(needle) ||
      space.description.toLowerCase().includes(needle)
    );
  });
  const spacesLoading = spacesStatus === 'loading' && !retrying;
  const showSpacesError = spacesStatus === 'error' || retrying;
  const selectValue = spacesLoading
    ? copy.spacesLoading
    : (selected?.name ?? copy.spacePlaceholder);

  useEffect(() => {
    if (!open) {
      return;
    }
    function onPointerDown(event: PointerEvent) {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopImmediatePropagation();
        setOpen(false);
      }
    }
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown, true);
    };
  }, [open]);

  function chooseSpace(nextId: string) {
    onChange(nextId);
    setOpen(false);
    setSpaceQuery('');
  }

  async function handleRetry() {
    if (retrying) {
      return;
    }
    setRetrying(true);
    try {
      await onRetrySpaces();
    } finally {
      setRetrying(false);
    }
  }

  return (
    <div className={styles.spaceSection}>
      <label className={styles.fieldLabel} htmlFor="enrollment-space-select">
        <span>{copy.space}</span>
        <span className={styles.optionalBadge}>{copy.optionalBadge}</span>
      </label>
      {showSpacesError ? (
        <div className={styles.groupsError} role="alert" data-testid="spaces-load-error">
          <span className={styles.groupsErrorCopy}>
            <WarningIcon />
            <span>{copy.spacesError}</span>
          </span>
          <Button
            variant="secondary"
            size="sm"
            block={false}
            className={styles.groupsRetry}
            loading={retrying}
            disabled={retrying}
            data-testid="retry-spaces"
            onClick={() => void handleRetry()}
          >
            <RefreshIcon />
            {copy.retry}
          </Button>
        </div>
      ) : null}
      <div className={styles.spaceSelect} ref={selectRef}>
        <button
          type="button"
          id="enrollment-space-select"
          className={styles.groupSelectTrigger}
          aria-label={copy.space}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={open ? listboxId : undefined}
          aria-busy={spacesLoading || undefined}
          disabled={spacesLoading}
          data-testid="space-select"
          onClick={() => setOpen((current) => !current)}
        >
          <FolderIcon />
          <span className={styles.groupSelectValue}>{selectValue}</span>
          <ChevronIcon className={styles.groupSelectChevron} />
        </button>
        {open ? (
          <div className={styles.groupOptions} id={listboxId} role="listbox">
            <input
              type="search"
              className={styles.groupSearch}
              value={spaceQuery}
              placeholder={copy.spaceSearch}
              aria-label={copy.spaceSearch}
              data-testid="space-search"
              onChange={(event) => setSpaceQuery(event.target.value)}
            />
            <button
              type="button"
              className={styles.groupOption}
              role="option"
              aria-selected={!spaceId}
              data-testid="space-option-none"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => chooseSpace('')}
            >
              <span className={styles.groupOptionSwatch} aria-hidden="true" />
              <span className={styles.groupOptionCopy}>
                <strong>{copy.noSpace}</strong>
              </span>
            </button>
            {visibleSpaces.map((space) => (
              <button
                key={space.id}
                type="button"
                className={styles.groupOption}
                role="option"
                aria-selected={spaceId === space.id}
                data-testid={`space-option-${space.id}`}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => chooseSpace(space.id)}
              >
                <span
                  className={styles.groupOptionSwatch}
                  style={{ background: space.color }}
                  aria-hidden="true"
                />
                <span className={styles.groupOptionCopy}>
                  <strong>{space.name}</strong>
                  <small>
                    {[
                      space.description,
                      interpolate(copy.spaceServers, { count: space.serverCount }),
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </small>
                </span>
              </button>
            ))}
            {spacesStatus === 'success' && spaces.length === 0 ? (
              <p className={styles.hint}>{copy.spacesEmpty}</p>
            ) : null}
          </div>
        ) : null}
      </div>
      <p className={styles.hint}>{copy.spaceHint}</p>
      {canCreateSpace ? (
        <Button
          variant="secondary"
          block={false}
          className={styles.createSpaceButton}
          data-testid="create-space-from-wizard"
          onClick={() => setCreateOpen(true)}
        >
          <PlusIcon />
          {copy.createSpace}
        </Button>
      ) : null}

      <CreateServerSpaceDialog
        open={createOpen}
        existingNames={spaces.map((space) => space.name)}
        existingSlugs={spaces
          .map((space) => space.slug)
          .filter((item): item is string => Boolean(item))}
        existingTags={[...new Set(spaces.flatMap((space) => space.tags))]}
        onClose={() => setCreateOpen(false)}
        onCreated={(space) => {
          setCreateOpen(false);
          onCreatedSpace(space.id);
        }}
      />
    </div>
  );
}
