import { useId, type ComponentType, type SVGProps } from 'react';
import {
  Arm64Icon,
  CpuIcon,
  DebianIcon,
  LinuxIcon,
  SparkleIcon,
  UbuntuIcon,
} from '../../../../../features/dashboard/icons';
import type {
  Architecture,
  Distribution,
  WizardForm,
} from '../../../../../features/enrollment/types';
import { useI18n } from '../../../../../i18n';
import styles from '../enrollment-wizard.module.css';

type CardIcon = ComponentType<SVGProps<SVGSVGElement>>;

type SystemSelectionStepProps = {
  form: WizardForm;
  onChange: <K extends keyof WizardForm>(key: K, value: WizardForm[K]) => void;
};

export function SystemSelectionStep({ form, onChange }: SystemSelectionStepProps) {
  const { messages } = useI18n();
  const copy = messages.servers.create;
  const titleId = useId();
  const descriptionId = useId();
  const statusId = useId();
  const auto = form.detectAutomatically;
  const distributions: Array<{ id: Distribution; label: string; Icon: CardIcon }> = [
    { id: 'ubuntu', label: copy.ubuntu, Icon: UbuntuIcon },
    { id: 'debian', label: copy.debian, Icon: DebianIcon },
    { id: 'other', label: copy.otherLinux, Icon: LinuxIcon },
  ];
  const architectures: Array<{
    id: Architecture;
    label: string;
    hint: string;
    Icon: CardIcon;
  }> = [
    { id: 'amd64', label: copy.amd64, hint: copy.amd64Hint, Icon: CpuIcon },
    { id: 'arm64', label: copy.arm64, hint: copy.arm64Hint, Icon: Arm64Icon },
  ];

  return (
    <div className={styles.systemStep} data-testid="system-selection-step">
      <div className={styles.autoDetectRow}>
        <span className={styles.autoDetectIcon} aria-hidden="true">
          <SparkleIcon />
        </span>
        <div className={styles.autoDetectCopy}>
          <p id={titleId} className={styles.autoDetectTitle}>
            {copy.detectAutomaticallyTitle}
          </p>
          <p id={descriptionId} className={styles.autoDetectDescription}>
            {copy.detectAutomaticallyDescription}
          </p>
        </div>
        <button
          type="button"
          className={styles.autoDetectSwitch}
          role="switch"
          aria-checked={auto}
          aria-labelledby={titleId}
          aria-describedby={`${descriptionId} ${statusId}`}
          data-testid="detect-automatically"
          onClick={() => onChange('detectAutomatically', !auto)}
        >
          <span className={styles.autoDetectThumb} />
        </button>
      </div>
      <p id={statusId} role="status" className={styles.srOnly}>
        {auto ? copy.autoDetectOnStatus : copy.autoDetectOffStatus}
      </p>

      <div className={styles.systemSection}>
        <p className={styles.fieldLabel} id="enrollment-distribution-label">
          {copy.distribution}
        </p>
        <div
          className={`${styles.cards} ${auto ? styles.cardsDisabled : ''}`}
          role="radiogroup"
          aria-labelledby="enrollment-distribution-label"
          aria-disabled={auto || undefined}
        >
          {distributions.map((item) => (
            <button
              key={item.id}
              type="button"
              className={styles.card}
              aria-pressed={!auto && form.distribution === item.id}
              aria-disabled={auto}
              disabled={auto}
              tabIndex={auto ? -1 : 0}
              data-testid={`distro-${item.id}`}
              onClick={() => onChange('distribution', item.id)}
            >
              <span className={styles.cardIcon} aria-hidden="true">
                <item.Icon />
              </span>
              <strong>{item.label}</strong>
            </button>
          ))}
        </div>
        {auto ? <p className={styles.hint}>{copy.willDetectAutomatically}</p> : null}
      </div>

      <div className={styles.systemSection}>
        <label className={styles.fieldLabel} htmlFor="field-os-version">
          {copy.osVersion}
        </label>
        <input
          id="field-os-version"
          className={styles.systemVersion}
          value={auto ? '' : form.osVersion}
          placeholder={auto ? copy.willDetectAutomatically : copy.osVersionPlaceholder}
          disabled={auto}
          aria-disabled={auto}
          data-testid="os-version"
          onChange={(event) => onChange('osVersion', event.target.value)}
        />
      </div>

      <div className={styles.systemSection}>
        <p className={styles.fieldLabel} id="enrollment-architecture-label">
          {copy.architecture}
        </p>
        <div
          className={`${styles.cards} ${styles.cardsTwo} ${auto ? styles.cardsDisabled : ''}`}
          role="radiogroup"
          aria-labelledby="enrollment-architecture-label"
          aria-disabled={auto || undefined}
        >
          {architectures.map((item) => (
            <button
              key={item.id}
              type="button"
              className={styles.card}
              aria-pressed={!auto && form.architecture === item.id}
              aria-disabled={auto}
              disabled={auto}
              tabIndex={auto ? -1 : 0}
              data-testid={`arch-${item.id}`}
              onClick={() => onChange('architecture', item.id)}
            >
              <span className={styles.cardIcon} aria-hidden="true">
                <item.Icon />
              </span>
              <strong>{item.label}</strong>
              <span>{item.hint}</span>
            </button>
          ))}
        </div>
        {auto ? <p className={styles.hint}>{copy.willDetectAutomatically}</p> : null}
      </div>
    </div>
  );
}
