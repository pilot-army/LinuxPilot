import { CheckIcon } from '../../../../features/dashboard/icons';
import { stepStateFor } from '../../../../features/enrollment/machine';
import { WIZARD_STEPS, type WizardStep } from '../../../../features/enrollment/types';
import { useI18n } from '../../../../i18n';
import styles from './enrollment-wizard.module.css';

type AddServerStepperProps = {
  step: WizardStep;
  maxReached: WizardStep;
  errorStep: WizardStep | null;
  onGoTo: (step: WizardStep) => void;
};

const STEP_KEYS: Record<WizardStep, 'stepBasics' | 'stepConnect' | 'stepInstall' | 'stepVerify'> = {
  1: 'stepBasics',
  2: 'stepConnect',
  3: 'stepInstall',
  4: 'stepVerify',
};

export function AddServerStepper({ step, maxReached, errorStep, onGoTo }: AddServerStepperProps) {
  const { messages } = useI18n();
  const copy = messages.servers.create;

  return (
    <nav className={styles.addStepper} aria-label={copy.title} data-testid="add-server-stepper">
      {WIZARD_STEPS.map((id) => {
        const state = stepStateFor(id, step, maxReached, errorStep);
        const done = state === 'completed';
        const current = state === 'active';
        return (
          <button
            key={id}
            type="button"
            className={`${styles.addStep} ${styles.addTrack} ${done ? styles.addDone : ''}`}
            aria-current={current ? 'step' : undefined}
            aria-label={copy[STEP_KEYS[id]]}
            disabled={id > maxReached}
            data-testid={`wizard-nav-${id}`}
            onClick={() => onGoTo(id)}
          >
            <span className={styles.addIndex} data-state={state}>
              {done ? <CheckIcon /> : id}
            </span>
            <span>{copy[STEP_KEYS[id]]}</span>
          </button>
        );
      })}
    </nav>
  );
}
