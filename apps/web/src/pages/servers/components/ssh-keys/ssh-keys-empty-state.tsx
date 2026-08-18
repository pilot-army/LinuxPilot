import { CheckIcon, KeyIcon, ShieldIcon, ServersIcon } from '../../../../features/dashboard/icons';
import { useI18n } from '../../../../i18n';
import { Button } from '../../../../shared/ui/button';
import styles from '../../server-ssh-keys-page.module.css';

type SshKeysEmptyStateProps = {
  canCreate: boolean;
  onImport: () => void;
  onGenerate: () => void;
  onPublic: () => void;
};

export function SshKeysEmptyState({
  canCreate,
  onImport,
  onGenerate,
  onPublic,
}: SshKeysEmptyStateProps) {
  const { messages } = useI18n();
  const copy = messages.servers.sshKeys;
  const benefits = [
    { icon: <ShieldIcon />, label: copy.emptyBenefitAuth },
    { icon: <ServersIcon />, label: copy.emptyBenefitReuse },
    { icon: <CheckIcon />, label: copy.emptyBenefitRotate },
  ];

  return (
    <section className={styles.onboarding} data-testid="ssh-keys-empty">
      <div className={styles.onboardingHero}>
        <KeyIcon />
        <h2 id="ssh-keys-empty-title">{copy.emptyTitle}</h2>
        <p>{copy.emptyBody}</p>
        {canCreate ? (
          <div className={styles.toolbar}>
            <Button data-testid="empty-import-key" onClick={onImport}>
              {copy.emptyImport}
            </Button>
            <Button variant="secondary" data-testid="empty-generate-key" onClick={onGenerate}>
              {copy.emptyGenerate}
            </Button>
            <Button variant="ghost" data-testid="empty-public-key" onClick={onPublic}>
              {copy.emptyPublic}
            </Button>
          </div>
        ) : null}
        <p className={styles.meta}>{copy.emptyEncryption}</p>
      </div>
      <ul className={styles.benefits}>
        {benefits.map((item) => (
          <li key={item.label}>
            <span aria-hidden="true">{item.icon}</span>
            {item.label}
          </li>
        ))}
      </ul>
    </section>
  );
}
