import { useId, useRef, useState } from 'react';
import { ChevronDownIcon, FileUpIcon, PlusIcon } from '../../../features/dashboard/icons';
import { useI18n } from '../../../i18n';
import { AnchoredPopover } from '../../../shared/ui/anchored-popover';
import styles from '../servers-page.module.css';

type AddServerSplitButtonProps = {
  onAdd: () => void;
  onImport: () => void;
  testId?: string;
};

export function AddServerSplitButton({
  onAdd,
  onImport,
  testId = 'add-server',
}: AddServerSplitButtonProps) {
  const { messages } = useI18n();
  const copy = messages.servers.list;
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  return (
    <div className={styles.splitButton}>
      <button type="button" className={styles.splitMain} data-testid={testId} onClick={onAdd}>
        <PlusIcon />
        {copy.add}
      </button>
      <button
        ref={triggerRef}
        type="button"
        className={styles.splitChevron}
        aria-label={copy.addMenu}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        data-testid={`${testId}-menu`}
        onClick={() => setOpen((current) => !current)}
      >
        <ChevronDownIcon />
      </button>
      <AnchoredPopover
        open={open}
        onClose={() => setOpen(false)}
        anchorRef={triggerRef}
        id={menuId}
        role="menu"
        className={styles.menuPopover}
      >
        <button
          type="button"
          role="menuitem"
          data-testid={`${testId}-manual`}
          onClick={() => {
            setOpen(false);
            onAdd();
          }}
        >
          <PlusIcon />
          {copy.addManual}
        </button>
        <button
          type="button"
          role="menuitem"
          data-testid={`${testId}-import`}
          onClick={() => {
            setOpen(false);
            onImport();
          }}
        >
          <FileUpIcon />
          {copy.importConfig}
        </button>
      </AnchoredPopover>
    </div>
  );
}
