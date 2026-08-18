import { useEffect, useState } from 'react';
import { listServerAudit } from '../../../../api/servers';
import { formatLastSeen } from '../../../../features/servers/format';
import { useI18n } from '../../../../i18n';
import styles from '../../server-spaces-page.module.css';

function labelForAction(
  action: string,
  copy: {
    activityCreated: string;
    activityMoved: string;
    activityTags: string;
    activityRule: string;
    activityOperation: string;
  },
) {
  const value = action.toLowerCase();
  if (value.includes('space') && value.includes('create')) {
    return copy.activityCreated;
  }
  if (value.includes('assign') || value.includes('move')) {
    return copy.activityMoved;
  }
  if (value.includes('tag')) {
    return copy.activityTags;
  }
  if (value.includes('rule')) {
    return copy.activityRule;
  }
  if (value.includes('operation')) {
    return copy.activityOperation;
  }
  return action;
}

export function SpacesRecentActivity({ revision }: { revision?: string | null }) {
  const { messages } = useI18n();
  const copy = messages.servers.groups;
  const [items, setItems] = useState<{ id: string; action: string; createdAt: string }[]>([]);

  useEffect(() => {
    const params = new URLSearchParams({ page: '1', pageSize: '8' });
    let cancelled = false;
    void listServerAudit(params)
      .then((result) => {
        if (!cancelled) {
          setItems(
            result.items.map((item) => ({
              id: item.id,
              action: item.action,
              createdAt: item.createdAt,
            })),
          );
        }
      })
      .catch(() => {
        if (!cancelled) {
          setItems([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [revision]);

  return (
    <aside className={styles.sideCard} data-testid="spaces-activity">
      <h3>{copy.activityTitle}</h3>
      {items.length === 0 ? (
        <p>{copy.activityEmpty}</p>
      ) : (
        <ul className={styles.activityList}>
          {items.map((item) => (
            <li key={item.id} className={styles.activityItem}>
              <strong>{labelForAction(item.action, copy)}</strong>
              <div>{formatLastSeen(item.createdAt, messages.servers.list.time)}</div>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}

export function SpacesAssignmentRules() {
  const { messages } = useI18n();
  const copy = messages.servers.groups;
  return (
    <aside className={styles.sideCard} data-testid="spaces-rules">
      <h3>{copy.rulesTitle}</h3>
      <p>{copy.rulesEmpty}</p>
    </aside>
  );
}
