import { useCallback, useEffect, useId, useRef, useState, type RefObject } from 'react';
import {
  GROUP_COLOR_TOKENS,
  SPACE_ICONS,
  slugifySpaceName,
  type GroupColorToken,
  type ServerSpaceIcon,
} from '@linuxpilot/server-contracts';
import { ApiRequestError } from '../../../../api/client';
import { createServerGroup } from '../../../../api/servers';
import { LinkIcon, LockIcon, ServersIcon } from '../../../../features/dashboard/icons';
import {
  EMPTY_CREATE_SPACE_FORM,
  SPACE_DESCRIPTION_UI_MAX,
  isCreateSpaceFormDirty,
  mapCreateSpaceApiError,
  nextSlugFromName,
  validateCreateSpaceForm,
  type CreateSpaceFieldErrors,
  type CreateSpaceFormValue,
} from '../../../../features/groups/space-form';
import { interpolate } from '../../../../features/servers/format';
import { useI18n } from '../../../../i18n';
import { Button } from '../../../../shared/ui/button';
import { TextField } from '../../../../shared/ui/text-field';
import { GroupDialogShell } from './group-dialog-shell';
import { ServerSpaceAppearancePicker } from './server-space-appearance-picker';
import { ServerSpacePreview } from './server-space-preview';
import { ServerSpaceTagsInput } from './server-space-tags-input';
import styles from './create-space-dialog.module.css';

type CreateGroupDialogProps = {
  open: boolean;
  existingNames: string[];
  existingSlugs?: string[];
  existingTags?: string[];
  serverIds?: string[];
  onClose: () => void;
  onCreated: (space: { id: string; slug?: string | null }) => void;
};

export function CreateServerSpaceDialog(props: CreateGroupDialogProps) {
  return <CreateGroupDialog {...props} />;
}

/** @deprecated Use CreateServerSpaceDialog */
export function CreateGroupDialog({
  open,
  existingNames,
  existingSlugs = [],
  existingTags = [],
  serverIds = [],
  onClose,
  onCreated,
}: CreateGroupDialogProps) {
  const { messages } = useI18n();
  const copy = messages.servers.groups;
  const dialog = copy.createDialog;
  const titleId = useId();
  const nameRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState<CreateSpaceFormValue>(EMPTY_CREATE_SPACE_FORM);
  const [errors, setErrors] = useState<CreateSpaceFieldErrors>({});
  const [apiError, setApiError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }
    setValue(EMPTY_CREATE_SPACE_FORM);
    setErrors({});
    setApiError('');
    setSubmitting(false);
    setConfirmClose(false);
  }, [open]);

  const requestClose = useCallback(() => {
    if (submitting) {
      return;
    }
    if (confirmClose) {
      setConfirmClose(false);
      return;
    }
    if (isCreateSpaceFormDirty(value)) {
      setConfirmClose(true);
      return;
    }
    onClose();
  }, [confirmClose, onClose, submitting, value]);

  const formCopy = {
    nameRequired: copy.nameRequired,
    nameInvalid: copy.nameInvalid,
    nameTaken: copy.nameTaken,
    slugInvalid: copy.slugInvalid,
    slugTaken: dialog.slugTaken,
    slugReserved: dialog.slugReserved,
    descriptionLimit: dialog.descriptionLimit,
    tagInvalid: dialog.tagInvalid,
    tagsLimit: dialog.tagsLimit,
  };

  const liveErrors = validateCreateSpaceForm(value, formCopy, existingNames, existingSlugs);
  const displayErrors: CreateSpaceFieldErrors = {
    name: value.name.trim() ? (liveErrors.name ?? errors.name) : errors.name,
    slug: value.slug.trim() || value.name.trim() ? (liveErrors.slug ?? errors.slug) : errors.slug,
    description: liveErrors.description ?? errors.description,
    tags: errors.tags,
  };
  const valid = Object.keys(liveErrors).length === 0;

  function patch(next: Partial<CreateSpaceFormValue>) {
    setValue((current) => ({ ...current, ...next }));
  }

  async function submit() {
    if (submitting || !valid) {
      return;
    }
    const nextErrors = validateCreateSpaceForm(value, formCopy, existingNames, existingSlugs);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }
    setSubmitting(true);
    setApiError('');
    const body = {
      name: value.name.trim(),
      slug: value.slug.trim() || slugifySpaceName(value.name),
      description: value.description.trim(),
      icon: value.icon,
      color: GROUP_COLOR_TOKENS[value.color],
      tags: value.tags,
      ...(serverIds.length > 0 ? { serverIds } : {}),
    };
    try {
      const created = await createServerGroup(body);
      setValue(EMPTY_CREATE_SPACE_FORM);
      onCreated(created);
    } catch (cause) {
      if (cause instanceof ApiRequestError) {
        const mapped = mapCreateSpaceApiError(cause.status, cause.code, cause.message, {
          nameTaken: copy.nameTaken,
          slugTaken: dialog.slugTaken,
          slugReserved: dialog.slugReserved,
          forbidden: dialog.forbidden,
          networkError: copy.networkError,
          timeout: dialog.timeout,
          validationError: dialog.validationError,
          createFailed: dialog.createFailed,
        });
        if (mapped.field) {
          setErrors({ [mapped.field]: mapped.message });
        } else {
          setApiError(mapped.message);
        }
      } else {
        setApiError(dialog.createFailed);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <GroupDialogShell
      open={open}
      title={copy.create}
      subtitle={dialog.subtitle}
      titleId={titleId}
      testId="create-group-dialog"
      overlayClassName={styles.overlay}
      panelClassName={styles.panel}
      headerClassName={styles.header}
      headerMainClassName={styles.headerMain}
      headerCopyClassName={styles.headerCopy}
      bodyClassName={styles.body}
      footerClassName={styles.footer}
      closeClassName={styles.close}
      headerIcon={
        <span className={styles.headerIcon} aria-hidden="true">
          <ServersIcon />
        </span>
      }
      initialFocusRef={nameRef}
      footer={
        <>
          <p className={styles.requiredNote}>{dialog.requiredNote}</p>
          <div className={styles.actions}>
            <Button variant="secondary" onClick={requestClose} disabled={submitting}>
              {copy.cancel}
            </Button>
            <Button
              className={styles.submit}
              onClick={() => void submit()}
              loading={submitting}
              disabled={!valid || submitting}
              data-testid="create-group-submit"
            >
              {copy.create}
            </Button>
          </div>
        </>
      }
      layer={
        confirmClose ? (
          <div
            className={styles.confirmLayer}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="space-unsaved-title"
          >
            <div className={styles.confirm}>
              <h3 id="space-unsaved-title">{dialog.unsavedTitle}</h3>
              <p>{dialog.unsavedBody}</p>
              <div className={styles.confirmActions}>
                <Button variant="secondary" onClick={() => setConfirmClose(false)}>
                  {dialog.unsavedStay}
                </Button>
                <Button onClick={onClose} data-testid="space-unsaved-confirm">
                  {dialog.unsavedConfirm}
                </Button>
              </div>
            </div>
          </div>
        ) : null
      }
      onClose={requestClose}
    >
      <ServerSpaceForm
        value={value}
        errors={displayErrors}
        apiError={apiError}
        nameRef={nameRef}
        existingTags={existingTags}
        serverIds={serverIds}
        onNameChange={(name) =>
          patch({ name, slug: nextSlugFromName(name, value.slugManual, value.slug) })
        }
        onSlugChange={(slug) => patch({ slug, slugManual: true })}
        onToggleSlugMode={() =>
          patch(
            value.slugManual
              ? { slugManual: false, slug: value.name.trim() ? slugifySpaceName(value.name) : '' }
              : { slugManual: true },
          )
        }
        onDescriptionChange={(description) =>
          patch({ description: description.slice(0, SPACE_DESCRIPTION_UI_MAX) })
        }
        onIconChange={(icon) => patch({ icon })}
        onColorChange={(color) => patch({ color })}
        onTagsChange={(tags) => {
          patch({ tags });
          setErrors((current) => ({ ...current, tags: undefined }));
        }}
        onTagError={(error) => setErrors((current) => ({ ...current, tags: error }))}
      />
      <ServerSpacePreview
        name={value.name}
        description={value.description}
        tags={value.tags}
        icon={value.icon}
        color={value.color}
        title={dialog.preview}
        namePlaceholder={dialog.previewName}
        descriptionPlaceholder={dialog.previewDescription}
        serversLabel={copy.serversCount}
        benefitsTitle={dialog.benefitsTitle}
        benefits={[dialog.benefitOrganize, dialog.benefitShared, dialog.benefitSummary]}
      />
    </GroupDialogShell>
  );
}

type ServerSpaceFormProps = {
  value: CreateSpaceFormValue;
  errors: CreateSpaceFieldErrors;
  apiError: string;
  nameRef: RefObject<HTMLInputElement | null>;
  existingTags: string[];
  serverIds?: string[];
  onNameChange: (name: string) => void;
  onSlugChange: (slug: string) => void;
  onToggleSlugMode: () => void;
  onDescriptionChange: (description: string) => void;
  onIconChange: (icon: ServerSpaceIcon) => void;
  onColorChange: (color: GroupColorToken) => void;
  onTagsChange: (tags: string[]) => void;
  onTagError: (error?: string) => void;
};

function ServerSpaceForm({
  value,
  errors,
  apiError,
  nameRef,
  existingTags,
  serverIds = [],
  onNameChange,
  onSlugChange,
  onToggleSlugMode,
  onDescriptionChange,
  onIconChange,
  onColorChange,
  onTagsChange,
  onTagError,
}: ServerSpaceFormProps) {
  const { messages } = useI18n();
  const copy = messages.servers.groups;
  const dialog = copy.createDialog;
  const descriptionId = useId();
  const counterId = useId();
  const iconLabels = Object.fromEntries(
    SPACE_ICONS.map((icon) => [icon, dialog.icons[icon]]),
  ) as Record<ServerSpaceIcon, string>;

  return (
    <div className={styles.form}>
      {apiError ? (
        <p className={styles.alert} role="alert" aria-live="assertive">
          {apiError}
        </p>
      ) : null}
      {serverIds.length > 0 ? (
        <p className={styles.preselected} data-testid="space-preselected-servers">
          {serverIds.length === 1
            ? copy.preselectedServersOne
            : interpolate(copy.preselectedServers, { count: serverIds.length })}
        </p>
      ) : null}
      <TextField
        ref={nameRef}
        name="group-name"
        label={dialog.nameLabel}
        requiredMark
        value={value.name}
        error={errors.name}
        onChange={(event) => onNameChange(event.target.value)}
        data-testid="group-name"
      />
      <TextField
        name="group-slug"
        label={dialog.slugLabel}
        hint={dialog.slugHint}
        hintMuted
        value={value.slug}
        error={errors.slug}
        readOnly={!value.slugManual}
        prefix={<LinkIcon width={16} height={16} />}
        suffix={
          <button
            type="button"
            className={styles.unlock}
            onClick={onToggleSlugMode}
            aria-label={value.slugManual ? dialog.slugAuto : dialog.slugEdit}
            data-testid="space-slug-unlock"
          >
            <LockIcon width={16} height={16} />
          </button>
        }
        onChange={(event) => onSlugChange(event.target.value.toLowerCase())}
        data-testid="group-slug"
      />
      <div className={styles.textareaField}>
        <label className={styles.textareaLabel} htmlFor={descriptionId}>
          {copy.description}
        </label>
        <textarea
          id={descriptionId}
          className={`${styles.textarea} ${errors.description ? styles.textareaInvalid : ''}`}
          value={value.description}
          placeholder={dialog.descriptionPlaceholder}
          maxLength={SPACE_DESCRIPTION_UI_MAX}
          aria-invalid={Boolean(errors.description)}
          aria-describedby={errors.description ? `${descriptionId}-error` : counterId}
          onChange={(event) => onDescriptionChange(event.target.value)}
          data-testid="group-description"
        />
        <span className={styles.counter} id={counterId}>
          {value.description.length} / {SPACE_DESCRIPTION_UI_MAX}
        </span>
        {errors.description ? (
          <p className={styles.fieldError} id={`${descriptionId}-error`} role="alert">
            {errors.description}
          </p>
        ) : null}
      </div>
      <ServerSpaceAppearancePicker
        icon={value.icon}
        color={value.color}
        title={dialog.appearance}
        iconLegend={dialog.icon}
        colorLegend={dialog.color}
        iconLabels={iconLabels}
        colorLabels={copy.colors}
        onIconChange={onIconChange}
        onColorChange={onColorChange}
      />
      <ServerSpaceTagsInput
        tags={value.tags}
        suggestions={existingTags}
        label={copy.tags}
        hint={dialog.tagsHint}
        error={errors.tags}
        onChange={onTagsChange}
        onError={onTagError}
        invalidMessage={dialog.tagInvalid}
        limitMessage={dialog.tagsLimit}
      />
      <details className={styles.advanced}>
        <summary>{dialog.advancedTitle}</summary>
        <p>{dialog.advancedBody}</p>
      </details>
    </div>
  );
}
