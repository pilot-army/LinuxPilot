import { useId, useRef, useState } from 'react';
import { MoreIcon, PlayIcon, ServersIcon, UsersIcon } from '../../../features/dashboard/icons';
import { interpolate } from '../../../features/servers/format';
import { useI18n } from '../../../i18n';
import { AnchoredPopover } from '../../../shared/ui/anchored-popover';
import { Button } from '../../../shared/ui/button';
import styles from '../servers-page.module.css';

type BulkActionBarProps = {
  count: number;
  canUpdate: boolean;
  canDelete: boolean;
  hasGroups: boolean;
  onRunOperation: () => void;
  onAddToGroup: () => void;
  onMaintenance: () => void;
  onDelete: () => void;
  onRevoke: () => void;
  onClear: () => void;
};

export function BulkActionBar({
  count,
  canUpdate,
  canDelete,
  hasGroups,
  onRunOperation,
  onAddToGroup,
  onMaintenance,
  onDelete,
  onRevoke,
  onClear,
}: BulkActionBarProps) {
  const { messages } = useI18n();
  const copy = messages.servers.list.bulk;
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();
  if (count === 0) {
    return null;
  }

  return (
    <div className={styles.bulkBar} data-testid="servers-bulk-bar" role="region" aria-live="polite">
      <p>{count === 1 ? copy.selectedOne : interpolate(copy.selected, { count })}</p>
      <div className={styles.bulkActions}>
        {canUpdate ? (
          <Button variant="secondary" size="sm" onClick={onRunOperation}>
            <PlayIcon />
            {copy.runOperation}
          </Button>
        ) : null}
        {canUpdate ? (
          <Button variant="secondary" size="sm" onClick={onAddToGroup} disabled={!hasGroups}>
            <UsersIcon />
            {copy.addToGroup}
          </Button>
        ) : null}
        {canUpdate ? (
          <Button variant="secondary" size="sm" onClick={onMaintenance}>
            <ServersIcon />
            {copy.maintenance}
          </Button>
        ) : null}
        {canDelete ? (
          <div className={styles.rowMenu}>
            <button
              ref={menuRef}
              type="button"
              className={styles.menuTrigger}
              aria-label={copy.more}
              aria-expanded={menuOpen}
              aria-controls={menuId}
              onClick={() => setMenuOpen((open) => !open)}
            >
              <MoreIcon />
            </button>
            <AnchoredPopover
              open={menuOpen}
              onClose={() => setMenuOpen(false)}
              anchorRef={menuRef}
              id={menuId}
              role="menu"
              className={styles.menuPopover}
            >
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  onRevoke();
                }}
              >
                {messages.servers.detail.revoke}
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  onDelete();
                }}
              >
                {messages.servers.detail.delete}
              </button>
            </AnchoredPopover>
          </div>
        ) : null}
        <Button variant="ghost" size="sm" onClick={onClear}>
          {copy.clear}
        </Button>
      </div>
    </div>
  );
}
