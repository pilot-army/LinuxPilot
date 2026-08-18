import { CircleCheck, Download, KeyRound, ShieldCheck, type LucideIcon } from 'lucide-react';
import { useI18n } from '../../../i18n';
import styles from '../dashboard-page.module.css';

const SETUP_STEPS: {
  id: string;
  n: string;
  icon: LucideIcon;
  titleKey: 'connectionTitle' | 'agentTitle' | 'accessTitle' | 'readyTitle';
  bodyKey: 'connectionBody' | 'agentBody' | 'accessBody' | 'readyBody';
}[] = [
  {
    id: 'connection',
    n: '01',
    icon: KeyRound,
    titleKey: 'connectionTitle',
    bodyKey: 'connectionBody',
  },
  { id: 'agent', n: '02', icon: Download, titleKey: 'agentTitle', bodyKey: 'agentBody' },
  { id: 'access', n: '03', icon: ShieldCheck, titleKey: 'accessTitle', bodyKey: 'accessBody' },
  { id: 'ready', n: '04', icon: CircleCheck, titleKey: 'readyTitle', bodyKey: 'readyBody' },
];

export function SetupSteps() {
  const { messages } = useI18n();
  const copy = messages.dashboard.setup;

  return (
    <section className={styles.panel} data-testid="setup-progress" aria-label={copy.title}>
      <div className={styles.panelHead}>
        <h2>{copy.title}</h2>
      </div>
      <ol className={styles.setupSteps}>
        {SETUP_STEPS.map((step) => {
          const Icon = step.icon;
          return (
            <li key={step.id} className={styles.setupStep} data-testid={`setup-step-${step.id}`}>
              <span className={styles.setupIcon} aria-hidden="true">
                <Icon size={18} strokeWidth={2} />
              </span>
              <div className={styles.setupStepCopy}>
                <span className={styles.setupIndex}>{step.n}</span>
                <strong>{copy[step.titleKey]}</strong>
                <p>{copy[step.bodyKey]}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
