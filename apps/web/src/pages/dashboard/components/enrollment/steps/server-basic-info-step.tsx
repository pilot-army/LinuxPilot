import { useState, type RefObject } from 'react';
import { CheckIcon, SparkleIcon } from '../../../../../features/dashboard/icons';
import type { FieldErrors, WizardForm } from '../../../../../features/enrollment/types';
import { validateName } from '../../../../../features/enrollment/validation';
import { useI18n } from '../../../../../i18n';
import { TextField } from '../../../../../shared/ui/text-field';
import { AlmaLinuxLogo, DebianLogo, RockyLinuxLogo, UbuntuLogo } from '../../distro-logos';
import { GroupAndTagsStep } from './group-and-tags-step';
import { ServerRackArt } from '../wizard-art';
import styles from '../enrollment-wizard.module.css';
import type { ServerSpace } from '@linuxpilot/server-contracts';

type ServerBasicInfoStepProps = {
  form: WizardForm;
  errors: FieldErrors;
  spaces: ServerSpace[];
  spacesStatus: 'loading' | 'success' | 'error';
  nameRef: RefObject<HTMLInputElement | null>;
  onChange: <K extends keyof WizardForm>(key: K, value: WizardForm[K]) => void;
  onBlur: (key: 'name' | 'address') => void;
  onTagError: (error?: string) => void;
  onCreatedSpace: (id: string) => void;
  onRetrySpaces: () => void | Promise<unknown>;
};

export function ServerBasicInfoStep({
  form,
  errors,
  spaces,
  spacesStatus,
  nameRef,
  onChange,
  onBlur,
  onTagError,
  onCreatedSpace,
  onRetrySpaces,
}: ServerBasicInfoStepProps) {
  const { messages } = useI18n();
  const copy = messages.servers.create;
  const [nameChecked, setNameChecked] = useState(false);
  const nameValid = !validateName(form.name, copy);
  const showNameSuccess = nameChecked && nameValid && !errors.name;

  return (
    <div className={styles.addSplit} data-testid="server-basic-step">
      <div className={styles.formCard}>
        <h3>{copy.infoTitle}</h3>
        <TextField
          ref={nameRef}
          name="server-name"
          label={copy.nameLabel}
          placeholder={copy.namePlaceholder}
          requiredMark
          hint={copy.nameHintLong}
          hintMuted
          suffix={
            showNameSuccess ? (
              <span className={styles.successAffordance} aria-hidden="true">
                <CheckIcon />
              </span>
            ) : undefined
          }
          success={showNameSuccess ? copy.nameAvailable : undefined}
          value={form.name}
          error={errors.name}
          autoComplete="off"
          data-testid="server-name"
          onChange={(event) => {
            setNameChecked(false);
            onChange('name', event.target.value);
          }}
          onBlur={() => {
            setNameChecked(true);
            onBlur('name');
          }}
        />
        <TextField
          name="server-address"
          label={copy.addressLabel}
          placeholder={copy.addressPlaceholder}
          requiredMark
          hint={copy.addressHint}
          hintMuted
          value={form.address}
          error={errors.address}
          autoComplete="off"
          spellCheck={false}
          data-testid="server-address"
          onChange={(event) => onChange('address', event.target.value)}
          onBlur={() => onBlur('address')}
        />
        <GroupAndTagsStep
          form={form}
          errors={errors}
          spaces={spaces}
          spacesStatus={spacesStatus}
          onChange={onChange}
          onTagError={onTagError}
          onCreatedSpace={onCreatedSpace}
          onRetrySpaces={onRetrySpaces}
        />
      </div>
      <aside className={styles.sideCard}>
        <h3>
          <SparkleIcon />
          {copy.tipTitle}
        </h3>
        <p>{copy.tipBody}</p>
        <div className={styles.sideArt}>
          <ServerRackArt />
        </div>
        <p className={styles.fieldLabel}>{copy.compatDistros}</p>
        <ul className={styles.distroMini}>
          <li>
            <UbuntuLogo /> {copy.ubuntu}
          </li>
          <li>
            <DebianLogo /> {copy.debian}
          </li>
          <li>
            <AlmaLinuxLogo /> {copy.almaLinux}
          </li>
          <li>
            <RockyLinuxLogo /> {copy.rockyLinux}
          </li>
        </ul>
      </aside>
    </div>
  );
}
