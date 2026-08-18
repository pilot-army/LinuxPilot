import { useEffect, useMemo, useState } from 'react';
import {
  SERVER_STATUSES,
  type ServerStatus,
  type ServerSummary,
} from '@linuxpilot/server-contracts';
import { bulkAssignGroup, listServers } from '../../../../api/servers';
import { interpolate } from '../../../../features/servers/format';
import { useI18n } from '../../../../i18n';
import { Button } from '../../../../shared/ui/button';
import { GroupDialogShell } from './group-dialog-shell';
import styles from '../../server-groups-page.module.css';

type AssignServersDialogProps = {
  open: boolean;
  groupId: string | null;
  groups?: { id: string; name: string }[];
  ungroupedOnly?: boolean;
  onClose: () => void;
  onAssigned: () => void;
};

export function AssignServersDialog({
  open,
  groupId,
  groups = [],
  ungroupedOnly = false,
  onClose,
  onAssigned,
}: AssignServersDialogProps) {
  const { messages } = useI18n();
  const copy = messages.servers.groups;
  const [items, setItems] = useState<ServerSummary[]>([]);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<ServerStatus | ''>('');
  const [groupFilter, setGroupFilter] = useState(ungroupedOnly ? 'ungrouped' : 'all');
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [targetId, setTargetId] = useState(groupId ?? '');
  const [confirmMove, setConfirmMove] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }
    setSelected([]);
    setError('');
    setConfirmMove(false);
    setTargetId(groupId ?? groups[0]?.id ?? '');
    const params = new URLSearchParams({ page: '1', pageSize: '100', sort: 'name', order: 'asc' });
    if (q.trim()) {
      params.set('q', q.trim());
    }
    if (status) {
      params.set('status', status);
    }
    if (groupFilter === 'ungrouped') {
      params.set('unassigned', 'true');
    }
    void listServers(params)
      .then((result) => setItems(result.items))
      .catch(() => setError(copy.errorTitle));
  }, [open, q, status, groupFilter, copy.errorTitle]);

  const visible = useMemo(
    () =>
      items.filter((server) => {
        if (
          groupFilter !== 'all' &&
          groupFilter !== 'ungrouped' &&
          (server.spaceId ?? server.groupId) !== groupFilter
        ) {
          return false;
        }
        return true;
      }),
    [items, groupFilter],
  );
  const destinationId = ungroupedOnly ? targetId : groupId;
  const moving = visible.filter(
    (server) =>
      selected.includes(server.id) &&
      Boolean(server.spaceId ?? server.groupId) &&
      (server.spaceId ?? server.groupId) !== destinationId,
  );

  async function submit() {
    if (!destinationId || submitting || selected.length === 0) {
      return;
    }
    if (moving.length > 0 && !confirmMove) {
      setConfirmMove(true);
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await bulkAssignGroup({ serverIds: selected, spaceId: destinationId });
      onAssigned();
    } catch {
      setError(copy.errorTitle);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <GroupDialogShell
      open={open}
      title={ungroupedOnly ? copy.distribute : copy.assignTitle}
      testId="assign-servers-dialog"
      onClose={onClose}
    >
      <div className={styles.dialogBody}>
        <label className={styles.search}>
          <span className="sr-only">{copy.assignSearch}</span>
          <input
            type="search"
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder={copy.assignSearch}
            data-testid="assign-search"
          />
        </label>
        <label>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as ServerStatus | '')}
          >
            <option value="">{messages.servers.list.allStatuses}</option>
            {Object.values(SERVER_STATUSES).map((value) => (
              <option key={value} value={value}>
                {messages.servers.status[value]}
              </option>
            ))}
          </select>
        </label>
        {ungroupedOnly ? (
          <label>
            {copy.servers}
            <select
              value={targetId}
              onChange={(event) => setTargetId(event.target.value)}
              data-testid="assign-target-group"
            >
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <label>
            <select value={groupFilter} onChange={(event) => setGroupFilter(event.target.value)}>
              <option value="all">{messages.servers.list.allGroups}</option>
              <option value="ungrouped">{copy.noGroup}</option>
            </select>
          </label>
        )}
        <p>{interpolate(copy.assignSelected, { count: selected.length })}</p>
        {confirmMove ? <p role="alert">{copy.assignMoveConfirm}</p> : null}
        {error ? <p role="alert">{error}</p> : null}
        <div className={styles.assignList} data-testid="assign-server-list">
          {visible.map((server) => {
            const inGroup = (server.spaceId ?? server.groupId) === destinationId;
            return (
              <label key={server.id} className={styles.assignRow}>
                <input
                  type="checkbox"
                  checked={selected.includes(server.id)}
                  disabled={inGroup}
                  aria-label={server.hostname || server.name}
                  onChange={() =>
                    setSelected((current) =>
                      current.includes(server.id)
                        ? current.filter((id) => id !== server.id)
                        : [...current, server.id],
                    )
                  }
                />
                <div>
                  <strong>{server.hostname || server.name}</strong>
                  <small>
                    {inGroup
                      ? copy.alreadyInGroup
                      : (server.spaceName ?? server.groupName)
                        ? interpolate(copy.assignMoveWarning, {
                            name: server.spaceName ?? server.groupName ?? '',
                          })
                        : copy.noGroup}
                  </small>
                </div>
              </label>
            );
          })}
        </div>
      </div>
      <div className={styles.dialogActions}>
        <Button variant="secondary" onClick={onClose}>
          {copy.cancel}
        </Button>
        <Button
          onClick={() => void submit()}
          loading={submitting}
          disabled={selected.length === 0}
          data-testid="assign-submit"
        >
          {copy.assignConfirm}
        </Button>
      </div>
    </GroupDialogShell>
  );
}
