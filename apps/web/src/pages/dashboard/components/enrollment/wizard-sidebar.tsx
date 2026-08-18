import { CheckIcon, ServersIcon } from '../../../../features/dashboard/icons';
import { stepStateFor } from '../../../../features/enrollment/machine';
import type { WizardStep } from '../../../../features/enrollment/types';
import { useI18n } from '../../../../i18n';
import styles from './enrollment-wizard.module.css';

type WizardSidebarProps = {
  step: WizardStep;
  maxReached: WizardStep;
  errorStep: WizardStep | null;
  onGoTo: (step: WizardStep) => void;
};

const STEPS: Array<{
  id: WizardStep;
  title: 'stepBasics' | 'stepConnect' | 'stepInstall' | 'stepVerify';
  hint: 'stepBasicsHint' | 'stepConnectHint' | 'stepInstallHint' | 'stepVerifyHint';
}> = [
  { id: 1, title: 'stepBasics', hint: 'stepBasicsHint' },
  { id: 2, title: 'stepConnect', hint: 'stepConnectHint' },
  { id: 3, title: 'stepInstall', hint: 'stepInstallHint' },
  { id: 4, title: 'stepVerify', hint: 'stepVerifyHint' },
];

export function WizardSidebar({ step, maxReached, errorStep, onGoTo }: WizardSidebarProps) {
  const { messages } = useI18n();
  const copy = messages.servers.create;

  return (
    <aside className={styles.sidebar} data-testid="wizard-sidebar">
      <div className={styles.brand}>
        <span className={styles.brandIcon} aria-hidden="true">
          <ServersIcon />
        </span>
        {copy.processTitle}
      </div>
      <ol className={styles.steps}>
        {STEPS.map((item) => {
          const state = stepStateFor(item.id, step, maxReached, errorStep);
          return (
            <li key={item.id}>
              <span className={styles.stepRail} aria-hidden="true" />
              <button
                type="button"
                className={`${styles.step} ${styles[`step-${state}`]}`}
                disabled={state === 'pending'}
                aria-current={state === 'active' ? 'step' : undefined}
                data-testid={`wizard-nav-${item.id}`}
                onClick={() => onGoTo(item.id)}
              >
                <span className={styles.stepIndex} aria-hidden="true">
                  {state === 'completed' ? <CheckIcon /> : item.id}
                </span>
                <span className={styles.stepCopy}>
                  <strong>{copy[item.title]}</strong>
                  <span>{copy[item.hint]}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </aside>
  );
}
