import { InfoIcon } from '../../../../features/dashboard/icons';
import { useI18n } from '../../../../i18n';
import styles from '../../server-spaces-page.module.css';

export function ServerSpaceHowItWorks() {
  const { messages } = useI18n();
  const copy = messages.servers.groups;
  const steps = [
    { title: copy.howItWorksStep1Title, body: copy.howItWorksStep1Body },
    { title: copy.howItWorksStep2Title, body: copy.howItWorksStep2Body },
    { title: copy.howItWorksStep3Title, body: copy.howItWorksStep3Body },
  ];

  return (
    <aside className={styles.howItWorks} data-testid="spaces-how-it-works">
      <h2>{copy.howItWorksTitle}</h2>
      <ol className={styles.howList}>
        {steps.map((step, index) => (
          <li key={step.title} className={styles.howStep}>
            <span className={styles.howIndex} aria-hidden="true">
              {index + 1}
            </span>
            <div>
              <p>{step.title}</p>
              <small>{step.body}</small>
            </div>
          </li>
        ))}
      </ol>
      <p className={styles.howNote}>
        <InfoIcon />
        <span>{copy.howItWorksNote}</span>
      </p>
    </aside>
  );
}
