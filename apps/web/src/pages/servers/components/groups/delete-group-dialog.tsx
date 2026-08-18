import { useState } from 'react';
import type { ServerGroup } from '@linuxpilot/server-contracts';
import { deleteServerGroup } from '../../../../api/servers';
import { interpolate } from '../../../../features/servers/format';
import { useI18n } from '../../../../i18n';
import { Button } from '../../../../shared/ui/button';
import { GroupDialogShell } from './group-dialog-shell';
import styles from '../../server-groups-page.module.css';

type DeleteGroupDialogProps = {
  open: boolean;
  groups: ServerGroup[];
  targetIds: string[];
  onClose: () => void;
  onDeleted: () => void;
};

export function DeleteGroupDialog({
  open,
  groups,
  targetIds,
  onClose,
  onDeleted,
}: DeleteGroupDialogProps) {
  const { messages } = useI18n();
  const copy = messages.servers.groups;
  const targets = groups.filter((group) => targetIds.includes(group.id));
  const [reassignTo, setReassignTo] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const destinations = groups.filter((group) => !targetIds.includes(group.id));
  const serverCount = targets.reduce((sum, group) => sum + group.serverCount, 0);

  async function submit() {
    if (submitting || targets.length === 0) {
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      for (const group of targets) {
        await deleteServerGroup(group.id, {
          moveToSpaceId: reassignTo || null,
        });
      }
      onDeleted();
    } catch {
      setError(copy.errorTitle);
    } finally {
      setSubmitting(false);
    }
  }

  const titleName = targets[0]?.name ?? '';

  return (
    <GroupDialogShell
      open={open}
      title={copy.deleteTitle}
      testId="delete-group-dialog"
      onClose={onClose}
    >
      <div className={styles.dialogBody}>
        <p>
          {interpolate(copy.deleteBody, {
            name: titleName,
            count: serverCount,
          })}
        </p>
        <p>{copy.deleteHint}</p>
        {destinations.length > 0 ? (
          <label>
            {copy.deleteReassign}
            <select value={reassignTo} onChange={(event) => setReassignTo(event.target.value)}>
              <option value="">{copy.deleteKeepUngrouped}</option>
              {destinations.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        {error ? <p role="alert">{error}</p> : null}
      </div>
      <div className={styles.dialogActions}>
        <Button variant="secondary" onClick={onClose}>
          {copy.cancel}
        </Button>
        <Button
          onClick={() => void submit()}
          loading={submitting}
          data-testid="delete-group-confirm"
        >
          {copy.deleteConfirm}
        </Button>
      </div>
    </GroupDialogShell>
  );
}
