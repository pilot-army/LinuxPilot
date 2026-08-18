import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PERMISSIONS } from '@linuxpilot/auth-contracts';
import { usePermission } from '../../../auth/use-permission';
import { SearchIcon } from '../../../features/dashboard/icons';
import { useFocusTrap } from '../../../features/dashboard/use-focus-trap';
import { useMediaQuery } from '../../../features/dashboard/use-media-query';
import { useI18n } from '../../../i18n';
import styles from '../dashboard-page.module.css';

type CommandItem = {
  id: string;
  to: string;
  label: string;
};

export function GlobalCommandBar() {
  const { messages } = useI18n();
  const navigate = useNavigate();
  const canViewServers = usePermission(PERMISSIONS.SERVERS_VIEW);
  const canCreate = usePermission(PERMISSIONS.SERVERS_CREATE);
  const canAudit = usePermission(PERMISSIONS.AUDIT_VIEW);
  const canSshKeys = usePermission(PERMISSIONS.SSH_KEYS_READ);
  const isMobile = useMediaQuery('(max-width: 767px)');
  const isMac = useIsMac();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogId = useId();
  const copy = messages.dashboard.commandBar;
  const shortcut = isMac ? '⌘K' : 'Ctrl+K';

  const items = useMemo<CommandItem[]>(() => {
    const next: CommandItem[] = [
      { id: 'overview', to: '/dashboard', label: messages.dashboard.nav.overview },
    ];
    if (canViewServers) {
      next.push({ id: 'servers', to: '/servers', label: messages.dashboard.nav.servers });
      next.push({
        id: 'spaces',
        to: '/server-spaces',
        label: messages.navigation.items.servers + ' · ' + messages.servers.groups.title,
      });
      next.push({
        id: 'operations',
        to: '/server-operations',
        label: messages.servers.operations.title,
      });
    }
    if (canSshKeys) {
      next.push({
        id: 'ssh-keys',
        to: '/server-ssh-keys',
        label: messages.servers.sshKeys.title,
      });
    }
    if (canAudit) {
      next.push({ id: 'audit', to: '/server-audit', label: messages.servers.auditPage.title });
    }
    if (canCreate) {
      next.push({ id: 'add', to: '/servers/new', label: messages.dashboard.actions.addServer });
    }
    return next;
  }, [canAudit, canCreate, canSshKeys, canViewServers, messages]);

  const visible = items.filter((item) =>
    item.label.toLowerCase().includes(query.trim().toLowerCase()),
  );

  useFocusTrap(open, dialogRef);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen(true);
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (!open) {
      setQuery('');
      return;
    }
    queueMicrotask(() => inputRef.current?.focus());
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  function go(to: string) {
    setOpen(false);
    navigate(to);
    triggerRef.current?.focus();
  }

  return (
    <div className={styles.commandRoot}>
      {isMobile ? (
        <button
          ref={triggerRef}
          type="button"
          className={styles.iconButton}
          aria-label={messages.dashboard.actions.openSearch}
          data-testid="dashboard-command-open"
          onClick={() => setOpen(true)}
        >
          <SearchIcon />
        </button>
      ) : (
        <button
          ref={triggerRef}
          type="button"
          className={styles.commandTrigger}
          aria-label={copy.placeholder}
          data-testid="dashboard-command-open"
          onClick={() => setOpen(true)}
        >
          <SearchIcon className={styles.commandIcon} />
          <span>{copy.placeholder}</span>
          <kbd className={styles.commandKbd}>{shortcut}</kbd>
        </button>
      )}
      {open ? (
        <div className={styles.commandOverlay}>
          <button
            type="button"
            className={styles.overlay}
            aria-label={messages.common.actions.close}
            onClick={() => {
              setOpen(false);
              triggerRef.current?.focus();
            }}
          />
          <div
            ref={dialogRef}
            className={styles.commandDialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby={dialogId}
            data-testid="dashboard-command-dialog"
          >
            <h2 id={dialogId} className="sr-only">
              {copy.dialog}
            </h2>
            <label className={styles.commandField}>
              <span className="sr-only">{copy.placeholder}</span>
              <SearchIcon className={styles.commandIcon} />
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={copy.placeholder}
                data-testid="dashboard-command-input"
              />
            </label>
            {visible.length === 0 ? (
              <p className={styles.emptyBody}>{copy.empty}</p>
            ) : (
              <ul className={styles.commandList} role="listbox">
                {visible.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      role="option"
                      className={styles.commandOption}
                      data-testid={`dashboard-command-${item.id}`}
                      onClick={() => go(item.to)}
                    >
                      {item.label}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function useIsMac() {
  if (typeof navigator === 'undefined') {
    return false;
  }
  return /Mac|iPhone|iPad/.test(navigator.platform) || navigator.userAgent.includes('Mac');
}
