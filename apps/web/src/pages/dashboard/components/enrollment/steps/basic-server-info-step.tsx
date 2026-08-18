import { useEffect, useRef, useState, type RefObject } from 'react';
import {
  CheckIcon,
  InfoIcon,
  ServersIcon,
  SparkleIcon,
} from '../../../../../features/dashboard/icons';
import { DESCRIPTION_MAX } from '../../../../../features/enrollment/constants';
import type { FieldErrors, WizardForm } from '../../../../../features/enrollment/types';
import {
  generateRandomHostname,
  hostnameLooksCustom,
  validateName,
} from '../../../../../features/enrollment/validation';
import { useI18n } from '../../../../../i18n';
import { Button } from '../../../../../shared/ui/button';
import { TextField } from '../../../../../shared/ui/text-field';
import { UnsavedChangesDialog } from '../unsaved-changes-dialog';
import styles from '../enrollment-wizard.module.css';

type BasicServerInfoStepProps = {
  form: WizardForm;
  errors: FieldErrors;
  busy?: boolean;
  nameRef: RefObject<HTMLInputElement | null>;
  onChange: <K extends keyof WizardForm>(key: K, value: WizardForm[K]) => void;
  onBlur: (key: 'name' | 'hostname' | 'primaryIp' | 'description') => void;
};

export function BasicServerInfoStep({
  form,
  errors,
  busy = false,
  nameRef,
  onChange,
  onBlur,
}: BasicServerInfoStepProps) {
  const { messages } = useI18n();
  const copy = messages.servers.create;
  const [nameChecked, setNameChecked] = useState(false);
  const [pendingHostname, setPendingHostname] = useState<string | null>(null);
  const lastGenerated = useRef('');

  const nameValid = !validateName(form.name, copy);
  const showNameSuccess = nameChecked && nameValid && !errors.name;
  const counterTone =
    form.description.length >= DESCRIPTION_MAX
      ? 'limit'
      : form.description.length >= Math.floor(DESCRIPTION_MAX * 0.85)
        ? 'warn'
        : 'ok';

  useEffect(() => {
    if (!pendingHostname) {
      return;
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      setPendingHostname(null);
    }
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [pendingHostname]);

  function handleNameBlur() {
    setNameChecked(true);
    onBlur('name');
  }

  function applyHostname(next: string) {
    lastGenerated.current = next;
    onChange('hostname', next);
    setPendingHostname(null);
    onBlur('hostname');
  }

  function requestGenerate() {
    const next = generateRandomHostname();
    if (
      hostnameLooksCustom(form.hostname, lastGenerated.current) &&
      next !== form.hostname.trim()
    ) {
      setPendingHostname(next);
      return;
    }
    applyHostname(next);
  }

  return (
    <div className={styles.basicsStep}>
      <div className={styles.basicsField}>
        <TextField
          ref={nameRef}
          name="server-name"
          label={copy.nameLabel}
          placeholder={copy.namePlaceholder}
          requiredMark
          prefix={<ServersIcon />}
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
          disabled={busy}
          autoComplete="off"
          data-testid="server-name"
          onChange={(event) => {
            setNameChecked(false);
            onChange('name', event.target.value);
          }}
          onBlur={handleNameBlur}
        />
      </div>
      <div className={styles.hostnameRow}>
        <div className={`${styles.mono} ${styles.basicsField}`}>
          <TextField
            name="hostname"
            label={copy.hostnameLabel}
            placeholder={copy.hostnamePlaceholder}
            badge={copy.optionalBadge}
            hint={copy.hostnameHint}
            hintMuted
            value={form.hostname}
            error={errors.hostname}
            disabled={busy}
            autoComplete="off"
            spellCheck={false}
            data-testid="hostname"
            onChange={(event) => onChange('hostname', event.target.value)}
            onBlur={() => onBlur('hostname')}
          />
        </div>
        <Button
          type="button"
          variant="secondary"
          className={styles.generate}
          block={false}
          disabled={busy}
          data-testid="generate-hostname"
          onClick={requestGenerate}
        >
          <SparkleIcon />
          {copy.generateHostname}
        </Button>
      </div>
      <div className={`${styles.mono} ${styles.basicsField}`}>
        <TextField
          name="primary-ip"
          label={copy.primaryIpLabel}
          placeholder={copy.primaryIpPlaceholder}
          badge={copy.optionalBadge}
          hint={copy.primaryIpHint}
          hintMuted
          value={form.primaryIp}
          error={errors.primaryIp}
          disabled={busy}
          autoComplete="off"
          spellCheck={false}
          data-testid="primary-ip"
          onChange={(event) => onChange('primaryIp', event.target.value)}
          onBlur={() => onBlur('primaryIp')}
        />
      </div>
      <div className={styles.field}>
        <label className={styles.fieldLabel} htmlFor="field-description">
          <span>{copy.descriptionLabel}</span>
          <span className={styles.optionalBadge}>{copy.optionalBadge}</span>
        </label>
        <div className={styles.descriptionWrap}>
          <textarea
            className={styles.textarea}
            id="field-description"
            name="description"
            placeholder={copy.descriptionPlaceholder}
            maxLength={DESCRIPTION_MAX}
            value={form.description}
            disabled={busy}
            aria-invalid={Boolean(errors.description)}
            aria-describedby={
              errors.description
                ? 'field-description-error field-description-counter'
                : 'field-description-counter'
            }
            data-testid="description"
            onChange={(event) => onChange('description', event.target.value)}
            onBlur={() => onBlur('description')}
          />
          <span
            className={`${styles.counter} ${styles[`counter-${counterTone}`]}`}
            id="field-description-counter"
          >
            {form.description.length} / {DESCRIPTION_MAX}
          </span>
        </div>
        <span className={styles.messageSlot}>
          {errors.description ? (
            <span id="field-description-error" role="alert" className={styles.alert}>
              {errors.description}
            </span>
          ) : null}
        </span>
      </div>
      <aside className={styles.infoCallout}>
        <InfoIcon />
        <div>
          <strong>{copy.nextHintTitle}</strong>
          <p>{copy.nextHint}</p>
        </div>
      </aside>
      <UnsavedChangesDialog
        open={Boolean(pendingHostname)}
        title={copy.hostnameOverwriteTitle}
        body={copy.hostnameOverwriteBody}
        confirmLabel={copy.hostnameOverwriteConfirm}
        cancelLabel={copy.hostnameOverwriteKeep}
        confirmTestId="confirm-hostname-overwrite"
        dialogTestId="hostname-overwrite-dialog"
        onContinue={() => setPendingHostname(null)}
        onConfirm={() => {
          if (pendingHostname) {
            applyHostname(pendingHostname);
          }
        }}
      />
    </div>
  );
}
