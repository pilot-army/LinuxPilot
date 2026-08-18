import type { ServerGroup } from '@linuxpilot/server-contracts';
import { GroupCard } from './group-card';
import styles from '../../server-groups-page.module.css';

type GroupsGridProps = {
  items: ServerGroup[];
  selectedIds: string[];
  canManage: boolean;
  onToggle: (id: string) => void;
  onEdit: (id: string) => void;
  onAssign: (id: string) => void;
  onDelete: (id: string) => void;
  onRunOperation: (id: string) => void;
};

export function GroupsGrid({
  items,
  selectedIds,
  canManage,
  onToggle,
  onEdit,
  onAssign,
  onDelete,
  onRunOperation,
}: GroupsGridProps) {
  return (
    <div className={styles.grid} data-testid="groups-grid">
      {items.map((group) => (
        <GroupCard
          key={group.id}
          group={group}
          selected={false}
          checked={selectedIds.includes(group.id)}
          canManage={canManage}
          onToggle={() => onToggle(group.id)}
          onEdit={() => onEdit(group.id)}
          onAssign={() => onAssign(group.id)}
          onDelete={() => onDelete(group.id)}
          onRunOperation={() => onRunOperation(group.id)}
        />
      ))}
    </div>
  );
}
