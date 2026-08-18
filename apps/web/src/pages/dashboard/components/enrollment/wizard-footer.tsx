import { LockIcon } from '../../../../features/dashboard/icons';
import type { WizardPhase, WizardStep } from '../../../../features/enrollment/types';
import { interpolate } from '../../../../features/servers/format';
import { useI18n } from '../../../../i18n';
import { Button } from '../../../../shared/ui/button';
import styles from './enrollment-wizard.module.css';

type WizardFooterProps = {
  step: WizardStep;
  phase: WizardPhase;
  busy: boolean;
  canContinue: boolean;
  showSkip?: boolean;
  onBack: () => void;
  onCancel: () => void;
  onSkip?: () => void;
};

export function WizardFooter({
  step,
  phase,
  busy,
  canContinue,
  showSkip = false,
  onBack,
  onCancel,
  onSkip,
}: WizardFooterProps) {
  const { messages } = useI18n();
  const copy = messages.servers.create;
  const formMode = phase === 'form';
  const primaryLabel = step === 4 ? copy.addServer : messages.common.actions.continue;
  const testId = step === 4 ? 'create-server' : 'enrollment-next';

  if (!formMode && !showSkip && phase !== 'waiting_heartbeat' && phase !== 'installing_agent') {
    return null;
  }

  return (
    <footer className={styles.footer}>
      <div className={styles.addFooterMeta}>
        <span data-testid="wizard-progress">{interpolate(copy.stepOf, { step })}</span>
        {step === 4 ? (
          <span>
            <LockIcon /> {copy.encryptedSafe}
          </span>
        ) : null}
      </div>
      <div className={styles.footerActions}>
        {formMode && step > 1 ? (
          <Button
            variant="secondary"
            className={styles.back}
            block={false}
            data-testid="wizard-back"
            onClick={onBack}
          >
            {messages.common.actions.back}
          </Button>
        ) : null}
        <Button variant="ghost" className={styles.cancel} block={false} onClick={onCancel}>
          {messages.common.actions.cancel}
        </Button>
        {showSkip ? (
          <Button
            type="button"
            variant="ghost"
            className={styles.skip}
            block={false}
            data-testid="enrollment-skip"
            onClick={onSkip}
          >
            {copy.addLater}
          </Button>
        ) : null}
        {formMode ? (
          <Button
            type="submit"
            form="enrollment-wizard-form"
            className={styles.primary}
            block={false}
            loading={busy}
            disabled={!canContinue || busy}
            data-testid={testId}
          >
            {primaryLabel}
          </Button>
        ) : null}
      </div>
    </footer>
  );
}
