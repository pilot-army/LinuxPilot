import { useId, useState } from 'react';
import { ConnectionIcon, DocsIcon, RequirementsIcon } from '../../../features/dashboard/icons';
import { useI18n } from '../../../i18n';
import styles from '../dashboard-page.module.css';

type HelpCardProps = {
  onCheckConnection: () => void;
};

export function HelpCard({ onCheckConnection }: HelpCardProps) {
  const { messages } = useI18n();
  const copy = messages.dashboard.help;
  const [open, setOpen] = useState<'docs' | 'requirements' | null>(null);
  const dialogId = useId();
  const details = open === 'docs' || open === 'requirements' ? copy.requirements : null;

  return (
    <section
      className={`${styles.panel} ${styles.helpPanel}`}
      aria-labelledby="help-card-title"
      data-testid="help-card"
    >
      <div className={styles.panelHead}>
        <h2 id="help-card-title">{copy.title}</h2>
      </div>
      <ul className={styles.helpList}>
        <li>
          <button
            type="button"
            className={styles.helpLink}
            aria-expanded={open === 'docs'}
            aria-controls={open === 'docs' ? dialogId : undefined}
            data-testid="help-docs"
            onClick={() => setOpen((current) => (current === 'docs' ? null : 'docs'))}
          >
            <DocsIcon />
            <span>{copy.docs}</span>
          </button>
        </li>
        <li>
          <button
            type="button"
            className={styles.helpLink}
            data-testid="help-connection"
            onClick={onCheckConnection}
          >
            <ConnectionIcon />
            <span>{copy.connection}</span>
          </button>
        </li>
        <li>
          <button
            type="button"
            className={styles.helpLink}
            aria-expanded={open === 'requirements'}
            aria-controls={open === 'requirements' ? dialogId : undefined}
            data-testid="help-requirements"
            onClick={() =>
              setOpen((current) => (current === 'requirements' ? null : 'requirements'))
            }
          >
            <RequirementsIcon />
            <span>{copy.requirements}</span>
          </button>
        </li>
      </ul>
      {details ? (
        <div
          className={styles.helpDetails}
          id={dialogId}
          role="region"
          aria-label={copy.requirementsTitle}
        >
          <p className={styles.cardBody}>{copy.requirementsBody}</p>
        </div>
      ) : null}
    </section>
  );
}
