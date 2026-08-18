import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ServerSummary } from '@linuxpilot/server-contracts';
import { MoreIcon, PlusIcon, SearchIcon, ServersIcon } from '../../../../features/dashboard/icons';
import { useMediaQuery } from '../../../../features/dashboard/use-media-query';
import { interpolate } from '../../../../features/servers/format';
import { useI18n } from '../../../../i18n';
import { Button } from '../../../../shared/ui/button';
import styles from '../../server-spaces-page.module.css';

type UnassignedServersPickerProps = {
  servers: ServerSummary[];
  canManage: boolean;
  onCreate: (serverIds: string[]) => void;
};

export function UnassignedServersPicker({
  servers,
  canManage,
  onCreate,
}: UnassignedServersPickerProps) {
  const { messages } = useI18n();
  const copy = messages.servers.groups;
  const navigate = useNavigate();
  const isMobile = useMediaQuery('(max-width: 767px)');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [menuId, setMenuId] = useState('');

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) {
      return servers;
    }
    return servers.filter((server) => {
      const haystack = [server.name, server.hostname, server.primaryIp, ...(server.tags ?? [])]
        .join(' ')
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [query, servers]);

  const selectedVisible = selected.filter((id) => visible.some((server) => server.id === id));
  const allVisibleSelected = visible.length > 0 && selectedVisible.length === visible.length;

  function toggle(id: string) {
    setSelected((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
    );
  }

  function toggleAllVisible() {
    if (allVisibleSelected) {
      setSelected((current) => current.filter((id) => !visible.some((server) => server.id === id)));
      return;
    }
    setSelected((current) => [...new Set([...current, ...visible.map((server) => server.id)])]);
  }

  return (
    <section className={styles.picker} id="spaces-unassigned" data-testid="spaces-unassigned">
      <h2>{copy.unassignedTitle}</h2>
      <div className={styles.pickerToolbar}>
        <label className={styles.selectAll}>
          <input
            type="checkbox"
            checked={allVisibleSelected}
            disabled={visible.length === 0}
            onChange={toggleAllVisible}
            data-testid="spaces-select-all"
          />
          <span className="sr-only">{copy.selectVisible}</span>
        </label>
        <p className={styles.selectedCount} aria-live="polite">
          {interpolate(copy.selectedOfTotal, {
            selected: selectedVisible.length,
            total: visible.length,
          })}
        </p>
        <label className={styles.pickerSearch}>
          <span className="sr-only">{copy.searchServers}</span>
          <SearchIcon />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={copy.searchServers}
            data-testid="spaces-server-search"
          />
        </label>
        {canManage && !isMobile ? (
          <Button
            size="sm"
            className={styles.desktopCreate}
            disabled={selected.length === 0}
            onClick={() => onCreate(selected)}
            data-testid="spaces-create-from-selected"
          >
            <PlusIcon />
            {copy.createWithSelected}
          </Button>
        ) : null}
      </div>
      {servers.length === 0 ? (
        <div className={styles.pickerSkeleton} aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      ) : (
        <ul className={styles.pickerList}>
          {visible.map((server) => (
            <li
              key={server.id}
              className={styles.pickerRow}
              data-testid={`spaces-server-${server.id}`}
            >
              <label className={styles.rowCheck}>
                <input
                  type="checkbox"
                  checked={selected.includes(server.id)}
                  onChange={() => toggle(server.id)}
                />
                <span className="sr-only">
                  {interpolate(messages.servers.list.selectServer, { name: server.name })}
                </span>
              </label>
              <span className={styles.serverIcon} aria-hidden="true">
                <ServersIcon />
              </span>
              <div className={styles.serverMeta}>
                <strong>{server.name}</strong>
                <small>{server.primaryIp || server.hostname || '—'}</small>
              </div>
              <span className={`${styles.status} ${styles[`status-${statusTone(server.status)}`]}`}>
                <span className={styles.statusDot} aria-hidden="true" />
                {messages.servers.status[server.status]}
              </span>
              <div className={styles.tagPills}>
                {(server.tags ?? []).slice(0, 3).map((tag) => (
                  <span key={tag} className={styles.tagPill}>
                    {tag}
                  </span>
                ))}
              </div>
              <div className={styles.pickerMenu}>
                <button
                  type="button"
                  className={styles.menuButton}
                  aria-label={copy.moreActions}
                  aria-expanded={menuId === server.id}
                  onClick={() => setMenuId((current) => (current === server.id ? '' : server.id))}
                >
                  <MoreIcon />
                </button>
                {menuId === server.id ? (
                  <div className={styles.menuPopover} role="menu">
                    {canManage ? (
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setMenuId('');
                          onCreate([server.id]);
                        }}
                      >
                        {copy.createFromThis}
                      </button>
                    ) : null}
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setMenuId('');
                        void navigate(`/servers?server=${server.id}`);
                      }}
                    >
                      {copy.open}
                    </button>
                  </div>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
      {canManage && isMobile ? (
        <div className={styles.stickyCreate}>
          <Button
            disabled={selected.length === 0}
            onClick={() => onCreate(selected)}
            data-testid="spaces-create-from-selected"
          >
            <PlusIcon />
            {copy.createWithSelected}
          </Button>
        </div>
      ) : null}
    </section>
  );
}

function statusTone(status: string) {
  if (status === 'ONLINE') {
    return 'online';
  }
  if (status === 'DEGRADED') {
    return 'warning';
  }
  if (status === 'OFFLINE' || status === 'REVOKED') {
    return 'offline';
  }
  return 'unknown';
}
