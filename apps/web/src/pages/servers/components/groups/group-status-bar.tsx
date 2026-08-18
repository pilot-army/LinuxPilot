import type { ServerGroup } from '@linuxpilot/server-contracts';
import { interpolate } from '../../../../features/servers/format';
import { useI18n } from '../../../../i18n';
import styles from '../../server-groups-page.module.css';

type GroupStatusBarProps = {
  group: Pick<
    ServerGroup,
    'serverCount' | 'onlineCount' | 'warningCount' | 'offlineCount' | 'withoutAgentCount'
  >;
};

export function GroupStatusBar({ group }: GroupStatusBarProps) {
  const { messages } = useI18n();
  const total = Math.max(group.serverCount, 1);
  const segments = [
    { key: 'online', count: group.onlineCount },
    { key: 'warning', count: group.warningCount },
    { key: 'offline', count: group.offlineCount },
    { key: 'unknown', count: group.withoutAgentCount },
  ] as const;
  const label = interpolate(messages.servers.groups.statusBar, {
    online: group.onlineCount,
    warning: group.warningCount,
    offline: group.offlineCount,
    withoutAgent: group.withoutAgentCount,
  });

  return (
    <div className={styles.statusBar} role="img" aria-label={label} data-testid="group-status-bar">
      {segments.map((segment) =>
        segment.count > 0 ? (
          <span
            key={segment.key}
            className={`${styles.statusSeg} ${styles[`seg-${segment.key}`]}`}
            style={{ width: `${(segment.count / total) * 100}%` }}
          />
        ) : null,
      )}
    </div>
  );
}
