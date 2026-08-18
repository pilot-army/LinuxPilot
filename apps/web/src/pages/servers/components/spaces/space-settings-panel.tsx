import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GROUP_COLOR_TOKENS,
  SERVER_ERROR_CODES,
  type ServerGroup,
  type UpdateGroupRequest,
} from '@linuxpilot/server-contracts';
import { ApiRequestError } from '../../../../api/client';
import { listServerGroups, updateServerGroup } from '../../../../api/servers';
import { hexToGroupToken } from '../../../../features/groups/colors';
import { spacePath } from '../../../../features/groups/space-path';
import { useI18n } from '../../../../i18n';
import { Button } from '../../../../shared/ui/button';
import { DeleteGroupDialog } from '../groups/delete-group-dialog';
import {
  GroupFormFields,
  parseTagInput,
  validateGroupForm,
  type GroupFormValue,
} from '../groups/group-form-fields';
import styles from '../../server-groups-page.module.css';

type SpaceSettingsPanelProps = {
  space: ServerGroup;
  canManage: boolean;
  onUpdated: (space: ServerGroup) => void;
};

export function SpaceSettingsPanel({ space, canManage, onUpdated }: SpaceSettingsPanelProps) {
  const { messages } = useI18n();
  const copy = messages.servers.groups;
  const navigate = useNavigate();
  const [value, setValue] = useState<GroupFormValue>(() => toForm(space));
  const [spaces, setSpaces] = useState<ServerGroup[]>([space]);
  const [errors, setErrors] = useState<Partial<Record<keyof GroupFormValue, string>>>({});
  const [apiError, setApiError] = useState('');
  const [saved, setSaved] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    setValue(toForm(space));
    setErrors({});
    setApiError('');
  }, [space]);

  useEffect(() => {
    let cancelled = false;
    void listServerGroups()
      .then((result) => {
        if (!cancelled) {
          setSpaces(result.items);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSpaces([space]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [space]);

  const existingNames = useMemo(
    () => spaces.filter((item) => item.id !== space.id).map((item) => item.name),
    [space.id, spaces],
  );
  const existingSlugs = useMemo(
    () =>
      spaces
        .filter((item) => item.id !== space.id)
        .map((item) => item.slug)
        .filter((item): item is string => Boolean(item)),
    [space.id, spaces],
  );

  async function submit() {
    if (!canManage || submitting) {
      return;
    }
    const nextErrors = validateGroupForm(value, copy);
    const name = value.name.trim().toLowerCase();
    if (existingNames.some((item) => item.toLowerCase() === name)) {
      nextErrors.name = copy.nameTaken;
    }
    const slug = value.slug.trim().toLowerCase();
    if (slug && existingSlugs.some((item) => item.toLowerCase() === slug)) {
      nextErrors.slug = copy.createDialog.slugTaken;
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }
    const body = diff(space, value);
    if (!body) {
      setApiError(copy.noChanges);
      setSaved('');
      return;
    }
    setSubmitting(true);
    setApiError('');
    setSaved('');
    try {
      const updated = await updateServerGroup(space.id, { ...body, version: space.version });
      onUpdated(updated);
      setSaved(messages.servers.groups.detail.settingsSaved);
      if (updated.slug && updated.slug !== space.slug) {
        navigate(spacePath(updated, 'settings'), { replace: true });
      }
    } catch (cause) {
      if (cause instanceof ApiRequestError && cause.code === SERVER_ERROR_CODES.VERSION_CONFLICT) {
        setApiError(copy.conflict);
      } else if (cause instanceof ApiRequestError && cause.status === 409) {
        const message = cause.message.toLowerCase();
        if (message.includes('slug')) {
          setErrors({ slug: copy.createDialog.slugTaken });
        } else {
          setErrors({ name: copy.nameTaken });
        }
      } else {
        setApiError(copy.errorTitle);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className={styles.dialogBody} data-testid="space-settings">
      <GroupFormFields value={value} errors={errors} onChange={setValue} />
      {apiError ? (
        <p role="alert" data-testid="space-settings-error">
          {apiError}
        </p>
      ) : null}
      {saved ? (
        <p role="status" data-testid="space-settings-saved">
          {saved}
        </p>
      ) : null}
      {canManage ? (
        <div className={styles.dialogActions}>
          <Button
            onClick={() => void submit()}
            loading={submitting}
            data-testid="space-settings-save"
          >
            {copy.save}
          </Button>
          <Button
            variant="secondary"
            onClick={() => setDeleteOpen(true)}
            data-testid="space-settings-delete"
          >
            {copy.delete}
          </Button>
        </div>
      ) : null}
      <DeleteGroupDialog
        open={deleteOpen}
        groups={spaces}
        targetIds={[space.id]}
        onClose={() => setDeleteOpen(false)}
        onDeleted={() => navigate('/server-spaces')}
      />
    </section>
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
