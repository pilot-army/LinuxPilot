import { interpolate } from '../../../../features/servers/format';
import { WIZARD_STEPS, type WizardStep } from '../../../../features/enrollment/types';
import { useI18n } from '../../../../i18n';
import styles from './enrollment-wizard.module.css';

type WizardProgressProps = {
  step: WizardStep;
};

export function WizardProgress({ step }: WizardProgressProps) {
  const { messages } = useI18n();
  const copy = messages.servers.create;
  const label = interpolate(copy.stepOf, { step });

  return (
    <div className={styles.segmentProgress} data-testid="wizard-progress">
      <span className={styles.segmentLabel}>{label}</span>
      <div
        className={styles.segments}
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={5}
        aria-valuenow={step}
        aria-label={label}
      >
        {WIZARD_STEPS.map((id) => (
          <span key={id} className={styles.segment} data-active={id <= step ? 'true' : undefined} />
        ))}
      </div>
    </div>
  );
}
