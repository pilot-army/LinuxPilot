import { NavLink } from 'react-router-dom';
import { PERMISSIONS } from '@linuxpilot/auth-contracts';
import { usePermission } from '../../../auth/use-permission';
import { useI18n } from '../../../i18n';
import styles from '../server-section.module.css';

export function ServerSectionTabs() {
  const { messages } = useI18n();
  const canAudit = usePermission(PERMISSIONS.AUDIT_VIEW);
  const canSshKeys = usePermission(PERMISSIONS.SSH_KEYS_READ);
  const items = [
    {
      to: '/servers',
      label: messages.servers.section.servers,
      end: true,
      testId: 'section-servers',
    },
    { to: '/server-spaces', label: messages.servers.section.groups, testId: 'section-spaces' },
    ...(canSshKeys
      ? [
          {
            to: '/server-ssh-keys',
            label: messages.servers.section.sshKeys,
            testId: 'section-ssh-keys',
          },
        ]
      : []),
    {
      to: '/server-operations',
      label: messages.servers.section.operations,
      testId: 'section-operations',
    },
    ...(canAudit
      ? [{ to: '/server-audit', label: messages.servers.section.audit, testId: 'section-audit' }]
      : []),
  ];

  return (
    <nav className={styles.sectionNav} aria-label={messages.servers.nav}>
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={'end' in item ? item.end : false}
          data-testid={item.testId}
          className={({ isActive }) =>
            isActive ? `${styles.sectionTab} ${styles.sectionTabActive}` : styles.sectionTab
          }
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
