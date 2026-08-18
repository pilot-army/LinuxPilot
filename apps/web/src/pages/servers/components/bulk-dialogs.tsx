import { useEffect, useState } from 'react';
import { OPERATION_TYPES, type OperationType } from '@linuxpilot/server-contracts';
import { interpolate } from '../../../features/servers/format';
import { useI18n } from '../../../i18n';
import { ConfirmDialog } from './confirm-dialog';
import styles from '../servers-page.module.css';

type BulkGroupDialogProps = {
  open: boolean;
  count: number;
  groups: { id: string; name: string }[];
  onClose: () => void;
  onConfirm: (groupId: string) => void;
};

export function BulkGroupDialog({ open, count, groups, onClose, onConfirm }: BulkGroupDialogProps) {
  const { messages } = useI18n();
  const copy = messages.servers.list.bulk;
  const [groupId, setGroupId] = useState(groups[0]?.id ?? '');

  useEffect(() => {
    if (open) {
      setGroupId(groups[0]?.id ?? '');
    }
  }, [open, groups]);

  if (!open) {
    return null;
  }

  return (
    <ConfirmDialog
      open={open}
      title={copy.addToGroup}
      confirmLabel={copy.addToGroup}
      onClose={onClose}
      onConfirm={() => {
        if (groupId) {
          onConfirm(groupId);
        }
      }}
      body={
        <div className={styles.dialogFields}>
          <p>{count === 1 ? copy.selectedOne : interpolate(copy.selected, { count })}</p>
          {groups.length === 0 ? (
            <p>{copy.noGroup}</p>
          ) : (
            <label>
              {copy.selectGroup}
              <select value={groupId} onChange={(event) => setGroupId(event.target.value)}>
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      }
    />
  );
}

type BulkOperationDialogProps = {
  open: boolean;
  count: number;
  offlineCount: number;
  onClose: () => void;
  onConfirm: (type: OperationType) => void;
};

export function BulkOperationDialog({
  open,
  count,
  offlineCount,
  onClose,
  onConfirm,
}: BulkOperationDialogProps) {
  const { messages } = useI18n();
  const copy = messages.servers.list.bulk;
  const [type, setType] = useState<OperationType>(OPERATION_TYPES.REFRESH_METRICS);

  useEffect(() => {
    if (open) {
      setType(OPERATION_TYPES.REFRESH_METRICS);
    }
  }, [open]);

  if (!open) {
    return null;
  }

  const typeLabel = messages.servers.operations.types[type];

  return (
    <ConfirmDialog
      open={open}
      title={copy.runOperation}
      confirmLabel={copy.runOperation}
      onClose={onClose}
      onConfirm={() => onConfirm(type)}
      body={
        <div className={styles.dialogFields}>
          <p>{interpolate(copy.confirmOperation, { type: typeLabel, count })}</p>
          {offlineCount > 0 ? (
            <p>{interpolate(copy.offlineWarning, { count: offlineCount })}</p>
          ) : null}
          <label>
            {messages.servers.operations.type}
            <select value={type} onChange={(event) => setType(event.target.value as OperationType)}>
              {Object.values(OPERATION_TYPES).map((value) => (
                <option key={value} value={value}>
                  {messages.servers.operations.types[value]}
                </option>
              ))}
            </select>
          </label>
        </div>
      }
    />
  );
}

type BulkMaintenanceDialogProps = {
  open: boolean;
  count: number;
  onClose: () => void;
  onConfirm: (reason: string) => void;
};

export function BulkMaintenanceDialog({
  open,
  count,
  onClose,
  onConfirm,
}: BulkMaintenanceDialogProps) {
  const { messages } = useI18n();
  const copy = messages.servers.list.bulk;
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (open) {
      setReason('');
    }
  }, [open]);

  if (!open) {
    return null;
  }

  return (
    <ConfirmDialog
      open={open}
      title={copy.maintenance}
      confirmLabel={copy.maintenance}
      onClose={onClose}
      onConfirm={() => {
        if (reason.trim()) {
          onConfirm(reason.trim());
        }
      }}
      body={
        <div className={styles.dialogFields}>
          <p>{interpolate(copy.confirmMaintenance, { count })}</p>
          <label>
            {copy.reason}
            <input
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder={copy.reasonPlaceholder}
              maxLength={500}
            />
          </label>
        </div>
      }
    />
  );
}
