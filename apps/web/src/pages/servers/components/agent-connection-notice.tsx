import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CloseIcon, WarningIcon } from '../../../features/dashboard/icons';
import { interpolate } from '../../../features/servers/format';
import { useI18n } from '../../../i18n';
import styles from '../servers-page.module.css';

const DISMISS_KEY = 'linuxpilot.servers.agentBannerDismissed';

type AgentConnectionNoticeProps = {
  count: number;
  serverName?: string;
  serverId?: string;
  onDetails: () => void;
};

export function AgentConnectionNotice({
  count,
  serverName,
  serverId,
  onDetails,
}: AgentConnectionNoticeProps) {
  const { messages } = useI18n();
  const [dismissed, setDismissed] = useState(false);
  const copy = messages.servers.list;

  useEffect(() => {
    try {
      setDismissed(sessionStorage.getItem(DISMISS_KEY) === '1');
    } catch {
      setDismissed(false);
    }
  }, []);

  if (count <= 0 || dismissed) {
    return null;
  }

  const message =
    count === 1 && serverName
      ? interpolate(copy.noticeNamed, { name: serverName })
      : count === 1
        ? copy.noticeOne
        : interpolate(copy.notice, { count });

  function dismiss() {
    try {
      sessionStorage.setItem(DISMISS_KEY, '1');
    } catch {
      // Ignore quota / private-mode failures.
    }
    setDismissed(true);
  }

  return (
    <div className={styles.notice} data-testid="servers-agent-notice">
      <p>
        <WarningIcon className={styles.noticeIcon} />
        <span>{message}</span>
      </p>
      <div className={styles.noticeActions}>
        <button type="button" className={styles.noticeLink} onClick={onDetails}>
          {copy.noticeMore}
        </button>
        {serverId ? (
          <Link to={`/servers/${serverId}`} className={styles.noticeLink}>
            {copy.noticeInstall}
          </Link>
        ) : (
          <button type="button" className={styles.noticeLink} onClick={onDetails}>
            {copy.noticeInstall}
          </button>
        )}
        <button
          type="button"
          className={styles.noticeDismiss}
          aria-label={copy.noticeDismiss}
          onClick={dismiss}
        >
          <CloseIcon />
        </button>
      </div>
    </div>
  );
}
