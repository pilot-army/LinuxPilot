import { useEffect, useState } from 'react';
import {
  GROUP_COLOR_TOKENS,
  SERVER_ERROR_CODES,
  type ServerGroup,
  type UpdateGroupRequest,
} from '@linuxpilot/server-contracts';
import { ApiRequestError } from '../../../../api/client';
import { getServerGroup, updateServerGroup } from '../../../../api/servers';
import { hexToGroupToken } from '../../../../features/groups/colors';
import { useI18n } from '../../../../i18n';
import { Button } from '../../../../shared/ui/button';
import { GroupDialogShell } from './group-dialog-shell';
import {
  GroupFormFields,
  parseTagInput,
  validateGroupForm,
  type GroupFormValue,
} from './group-form-fields';
import styles from '../../server-groups-page.module.css';

type EditGroupDialogProps = {
  open: boolean;
  group: ServerGroup | null;
  existingNames: string[];
  onClose: () => void;
  onUpdated: () => void;
};

export function EditGroupDialog({
  open,
  group,
  existingNames,
  onClose,
  onUpdated,
}: EditGroupDialogProps) {
  const { messages } = useI18n();
  const copy = messages.servers.groups;
  const [value, setValue] = useState<GroupFormValue | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof GroupFormValue, string>>>({});
  const [apiError, setApiError] = useState('');
  const [conflict, setConflict] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open && group) {
      setValue(toForm(group));
      setErrors({});
      setApiError('');
      setConflict(false);
    }
  }, [open, group]);

  if (!group || !value) {
    return (
      <GroupDialogShell open={open} title={copy.edit} testId="edit-group-dialog" onClose={onClose}>
        <p>{messages.common.status.loading}</p>
      </GroupDialogShell>
    );
  }

  async function submit() {
    if (!value || !group || submitting) {
      return;
    }
    const current = group;
    const nextErrors = validateGroupForm(value, copy);
    const name = value.name.trim().toLowerCase();
    if (existingNames.some((item) => item.toLowerCase() === name && item !== current.name)) {
      nextErrors.name = copy.nameTaken;
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }
    const body = diff(current, value);
    if (!body) {
      setApiError(copy.noChanges);
      return;
    }
    setSubmitting(true);
    setApiError('');
    setConflict(false);
    try {
      await updateServerGroup(current.id, { ...body, version: current.version });
      onUpdated();
    } catch (cause) {
      if (cause instanceof ApiRequestError && cause.code === SERVER_ERROR_CODES.VERSION_CONFLICT) {
        setConflict(true);
        setApiError(copy.conflict);
      } else if (cause instanceof ApiRequestError && cause.status === 409) {
        setErrors({ name: copy.nameTaken });
      } else {
        setApiError(copy.errorTitle);
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function refreshConflict() {
    if (!group) {
      return;
    }
    const fresh = await getServerGroup(group.id);
    setValue(toForm(fresh));
    setConflict(false);
    setApiError('');
  }

  return (
    <GroupDialogShell open={open} title={copy.edit} testId="edit-group-dialog" onClose={onClose}>
      <GroupFormFields value={value} errors={errors} onChange={setValue} />
      {apiError ? <p role="alert">{apiError}</p> : null}
      <div className={styles.dialogActions}>
        {conflict ? (
          <Button variant="secondary" onClick={() => void refreshConflict()}>
            {copy.conflictRefresh}
          </Button>
        ) : (
          <Button variant="secondary" onClick={onClose}>
            {copy.cancel}
          </Button>
        )}
        <Button onClick={() => void submit()} loading={submitting} data-testid="edit-group-submit">
          {copy.save}
        </Button>
      </div>
    </GroupDialogShell>
  );
}

function toForm(group: ServerGroup): GroupFormValue {
  return {
    name: group.name,
    slug: group.slug ?? '',
    description: group.description,
    color: hexToGroupToken(group.color),
    tags: group.tags.join(', '),
    notificationsEnabled: group.notificationsEnabled,
  };
}

function diff(group: ServerGroup, value: GroupFormValue): UpdateGroupRequest | null {
  const next: UpdateGroupRequest = {};
  if (value.name.trim() !== group.name) {
    next.name = value.name.trim();
  }
  const slug = value.slug.trim().toLowerCase();
  if (slug && slug !== (group.slug ?? '')) {
    next.slug = slug;
  }
  if (value.description.trim() !== group.description) {
    next.description = value.description.trim();
  }
  if (GROUP_COLOR_TOKENS[value.color] !== group.color) {
    next.color = GROUP_COLOR_TOKENS[value.color];
  }
  const tags = parseTagInput(value.tags);
  if (tags.join(',') !== group.tags.join(',')) {
    next.tags = tags;
  }
  if (value.notificationsEnabled !== group.notificationsEnabled) {
    next.notificationsEnabled = value.notificationsEnabled;
  }
  return Object.keys(next).length > 0 ? next : null;
}
