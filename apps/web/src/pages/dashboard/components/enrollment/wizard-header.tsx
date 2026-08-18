import { CloseIcon } from '../../../../features/dashboard/icons';
import { useI18n } from '../../../../i18n';
import styles from './enrollment-wizard.module.css';

type WizardHeaderProps = {
  onClose: () => void;
};

export function WizardHeader({ onClose }: WizardHeaderProps) {
  const { messages } = useI18n();
  const copy = messages.servers.create;

  return (
    <header className={styles.addHeader}>
      <div>
        <h2 id="enrollment-wizard-title">{copy.title}</h2>
        <p>{copy.subtitle}</p>
      </div>
      <button
        type="button"
        className={styles.close}
        aria-label={copy.closeWizard}
        data-testid="wizard-close"
        onClick={onClose}
      >
        <CloseIcon />
      </button>
    </header>
  );
}
