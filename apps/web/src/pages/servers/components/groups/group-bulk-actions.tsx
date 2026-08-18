import { useState } from 'react';
import { MoreIcon } from '../../../../features/dashboard/icons';
import { interpolate } from '../../../../features/servers/format';
import { useI18n } from '../../../../i18n';
import { Button } from '../../../../shared/ui/button';
import styles from '../../server-groups-page.module.css';

type GroupBulkActionsProps = {
  count: number;
  canManage: boolean;
  sticky?: boolean;
  onOpen: () => void;
  onAssign: () => void;
  onEdit: () => void;
  onExport: () => void;
  onDelete: () => void;
};

export function GroupBulkActions({
  count,
  canManage,
  sticky,
  onOpen,
  onAssign,
  onEdit,
  onExport,
  onDelete,
}: GroupBulkActionsProps) {
  const { messages } = useI18n();
  const copy = messages.servers.groups.bulk;
  const [menuOpen, setMenuOpen] = useState(false);
  if (count === 0) {
    return null;
  }

  return (
    <div
      className={`${styles.bulkBar} ${sticky ? styles.mobileBulk : ''}`}
      data-testid="groups-bulk-bar"
      role="region"
      aria-live="polite"
    >
      <p>{count === 1 ? copy.selectedOne : interpolate(copy.selected, { count })}</p>
      <div className={styles.bulkActions}>
        {count === 1 ? (
          <Button variant="secondary" onClick={onOpen}>
            {copy.open}
          </Button>
        ) : null}
        {canManage ? (
          <>
            <Button variant="secondary" onClick={onAssign}>
              {copy.addServers}
            </Button>
            {count === 1 ? (
              <Button variant="secondary" onClick={onEdit}>
                {copy.edit}
              </Button>
            ) : null}
          </>
        ) : null}
        <div className={styles.menuWrap}>
          <button
            type="button"
            className={styles.iconAction}
            aria-label={messages.servers.groups.moreActions}
            aria-expanded={menuOpen}
            data-testid="groups-bulk-more"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <MoreIcon />
          </button>
          {menuOpen ? (
            <div className={styles.menuPopover} role="menu">
              <button type="button" onClick={onExport}>
                {copy.export}
              </button>
              {canManage ? (
                <button type="button" onClick={onDelete}>
                  {copy.delete}
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
