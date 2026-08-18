import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { PERMISSIONS } from '@linuxpilot/auth-contracts';
import { usePermission } from '../../../../auth/use-permission';
import type { EnrollmentPreview } from '../../../../features/dashboard/types';
import { useBodyScrollLock } from '../../../../features/dashboard/use-body-scroll-lock';
import { useFocusTrap } from '../../../../features/dashboard/use-focus-trap';
import type { WizardStep } from '../../../../features/enrollment/types';
import { useEnrollmentWizard } from '../../../../features/enrollment/use-enrollment-wizard';
import { interpolate } from '../../../../features/servers/format';
import { useI18n } from '../../../../i18n';
import { AddServerStepper } from './add-server-stepper';
import { AgentInstallationStep } from './steps/agent-installation-step';
import { ServerAgentStep } from './steps/server-agent-step';
import { ServerBasicInfoStep } from './steps/server-basic-info-step';
import { ServerConnectionStep } from './steps/server-connection-step';
import { ServerCreationProgress } from './steps/server-creation-progress';
import { ServerCreationResult } from './steps/server-creation-result';
import { ServerReviewStep } from './steps/server-review-step';
import { UnsavedChangesDialog } from './unsaved-changes-dialog';
import { WizardFooter } from './wizard-footer';
import { WizardHeader } from './wizard-header';
import styles from './enrollment-wizard.module.css';

type EnrollmentWizardProps = {
  open?: boolean;
  variant?: 'page' | 'dialog';
  initialStep?: WizardStep;
  initialSpaceId?: string;
  onOpenChange?: (open: boolean) => void;
  onClose?: () => void;
  onIssued?: (preview: EnrollmentPreview) => void;
  onConnected?: (serverId: string) => void;
  onSuccess?: (serverId: string) => void;
};

export function EnrollmentWizard({
  open = true,
  variant = 'page',
  initialStep = 1,
  initialSpaceId,
  onOpenChange,
  onClose,
  onIssued,
  onConnected,
  onSuccess,
}: EnrollmentWizardProps) {
  const { messages } = useI18n();
  const copy = messages.servers.create;
  const canCreate = usePermission(PERMISSIONS.SERVERS_CREATE);
  const navigate = useNavigate();
  const panelRef = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const dialog = variant === 'dialog';
  const wizard = useEnrollmentWizard({
    open,
    initialStep,
    initialSpaceId,
    validation: copy,
    errors: {
      network: copy.offline,
      forbidden: messages.errors.forbidden,
      generic: copy.genericError,
    },
    onIssued,
    onConnected: (id) => {
      onConnected?.(id);
      onSuccess?.(id);
    },
  });

  const finishClose = useCallback(() => {
    wizard.reset();
    onOpenChange?.(false);
    onClose?.();
    if (!dialog) {
      navigate('/servers');
    }
  }, [dialog, navigate, onClose, onOpenChange, wizard]);

  const skipAgent = useCallback(() => {
    wizard.reset();
    onOpenChange?.(false);
    onClose?.();
    navigate('/servers');
  }, [navigate, onClose, onOpenChange, wizard]);

  const requestDismiss = useCallback(() => {
    if (wizard.requestClose()) {
      finishClose();
    }
  }, [finishClose, wizard]);

  useFocusTrap(dialog && open, panelRef, nameRef);
  useBodyScrollLock(dialog && open);

  useLayoutEffect(() => {
    if (!dialog || !open) {
      return;
    }
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    previousFocus.current = previous;
    return () => {
      previous?.focus();
    };
  }, [dialog, open]);

  useEffect(() => {
    if (!open || wizard.step !== 1) {
      return;
    }
    nameRef.current?.focus();
  }, [open, wizard.step]);

  useEffect(() => {
    if (!dialog || !open) {
      return;
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') {
        return;
      }
      event.preventDefault();
      if (
        document.querySelector('[data-testid="create-group-dialog"]') ||
        document.querySelector('[data-testid="create-space-dialog"]')
      ) {
        return;
      }
      if (wizard.confirmClose || wizard.confirmInvalidate || wizard.confirmRegenerate) {
        wizard.setConfirmClose(false);
        wizard.setConfirmInvalidate(false);
        wizard.setConfirmRegenerate(false);
        return;
      }
      requestDismiss();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [dialog, open, requestDismiss, wizard]);

  function focusFirstError() {
    if (wizard.fieldErrors.name) {
      nameRef.current?.focus();
      return;
    }
    if (wizard.fieldErrors.address) {
      panelRef.current?.querySelector<HTMLElement>('#field-server-address')?.focus();
    }
  }

  async function onPrimary() {
    if (wizard.busy || wizard.phase !== 'form') {
      return;
    }
    const moved = await wizard.advance();
    if (!moved && wizard.step === 1) {
      focusFirstError();
    }
  }

  function openServer() {
    if (!wizard.serverId) {
      return;
    }
    const id = wizard.serverId;
    wizard.reset();
    onOpenChange?.(false);
    onClose?.();
    navigate(`/servers/${id}`);
  }

  function addAnother() {
    wizard.reset();
  }

  const canContinue =
    wizard.step === 1
      ? wizard.canContinueStep1
      : wizard.step === 2
        ? wizard.canContinueStep2
        : wizard.step === 3
          ? wizard.canContinueStep3
          : wizard.form.confirmAdd &&
            wizard.connectionCheck !== 'error' &&
            wizard.compatCheck !== 'error' &&
            !wizard.busy;

  const showResult =
    wizard.phase === 'success' || wizard.phase === 'partial_success' || wizard.phase === 'error';
  const showProgress =
    wizard.phase === 'creating_server' ||
    wizard.phase === 'installing_agent' ||
    wizard.phase === 'waiting_heartbeat';
  const showToken =
    Boolean(wizard.secret) &&
    (wizard.form.installMode === 'manual' || wizard.phase === 'partial_success');

  if (!open) {
    return null;
  }

  if (!canCreate) {
    return (
      <p role="alert" className={styles.forbidden}>
        {messages.errors.forbidden}
      </p>
    );
  }

  const content = (
    <div
      ref={panelRef}
      className={`${dialog ? styles.dialog : styles.page} ${styles.wizard} ${styles.addWizard}`}
      role={dialog ? 'dialog' : undefined}
      aria-modal={dialog || undefined}
      aria-labelledby="enrollment-wizard-title"
      data-testid="enrollment-wizard"
    >
      <div className={styles.content}>
        <div className={styles.mobileBar} data-testid="wizard-mobile-bar">
          <p className={styles.mobileMeta}>{interpolate(copy.stepOf, { step: wizard.step })}</p>
        </div>
        <WizardHeader onClose={requestDismiss} />
        {wizard.phase === 'form' ? (
          <AddServerStepper
            step={wizard.step}
            maxReached={wizard.maxReached}
            errorStep={wizard.errorStep}
            onGoTo={wizard.goTo}
          />
        ) : null}
        <form
          id="enrollment-wizard-form"
          className={styles.body}
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            void onPrimary();
          }}
        >
          {wizard.apiError && wizard.phase === 'form' ? (
            <p className={styles.alert} role="alert">
              {wizard.apiError}
            </p>
          ) : null}
          {wizard.phase === 'form' && wizard.step === 1 ? (
            <ServerBasicInfoStep
              form={wizard.form}
              errors={wizard.fieldErrors}
              spaces={wizard.spaces}
              spacesStatus={wizard.spacesStatus}
              nameRef={nameRef}
              onChange={wizard.setField}
              onBlur={wizard.blurField}
              onTagError={wizard.setTagError}
              onCreatedSpace={wizard.selectCreatedSpace}
              onRetrySpaces={() => wizard.loadSpaces()}
            />
          ) : null}
          {wizard.phase === 'form' && wizard.step === 2 ? (
            <ServerConnectionStep
              form={wizard.form}
              errors={wizard.fieldErrors}
              connectionCheck={wizard.connectionCheck}
              onChange={wizard.setField}
              onBlur={wizard.blurField}
              onTest={wizard.runConnectionPreflight}
              onCancelTest={wizard.cancelConnectionPreflight}
            />
          ) : null}
          {wizard.phase === 'form' && wizard.step === 3 ? (
            <ServerAgentStep
              form={wizard.form}
              compatCheck={wizard.compatCheck}
              onChange={wizard.setField}
              onCheck={wizard.runCompatCheck}
              onCancelCheck={wizard.cancelCompatCheck}
            />
          ) : null}
          {wizard.phase === 'form' && wizard.step === 4 ? (
            <ServerReviewStep
              form={wizard.form}
              spaces={wizard.spaces}
              connectionCheck={wizard.connectionCheck}
              compatCheck={wizard.compatCheck}
              onGoTo={wizard.goTo}
              onChange={wizard.setField}
            />
          ) : null}
          {showProgress ? (
            <ServerCreationProgress phase={wizard.phase} timedOut={wizard.timedOut} />
          ) : null}
          {showToken ? (
            <AgentInstallationStep
              form={wizard.form}
              secret={wizard.secret}
              busy={wizard.regenerating}
              tokenCreated={wizard.tokenCreated}
              connectionOutcome={wizard.connection.outcome}
              agentNotReady={wizard.agentNotReady}
              onRequestRegenerate={wizard.requestRegenerate}
              onRetryCheck={() => void wizard.retryPoll()}
            />
          ) : null}
          {showResult ? (
            <ServerCreationResult
              phase={wizard.phase}
              formName={wizard.form.name}
              address={wizard.form.address}
              installMode={wizard.form.installMode}
              server={wizard.server}
              error={wizard.apiError}
              onOpenServer={openServer}
              onAddAnother={addAnother}
              onClose={finishClose}
              onRetry={() => void wizard.retryAgent()}
              onRetryForm={wizard.returnToForm}
            />
          ) : null}
        </form>
        <WizardFooter
          step={wizard.step}
          phase={wizard.phase}
          busy={wizard.busy || wizard.regenerating}
          canContinue={canContinue}
          showSkip={
            Boolean(wizard.serverId) &&
            (wizard.phase === 'waiting_heartbeat' ||
              wizard.phase === 'installing_agent' ||
              wizard.phase === 'partial_success' ||
              (showToken && wizard.phase === 'success'))
          }
          onBack={wizard.back}
          onCancel={requestDismiss}
          onSkip={skipAgent}
        />
      </div>
      <UnsavedChangesDialog
        open={wizard.confirmClose}
        title={copy.unsavedTitle}
        body={wizard.serverId ? copy.createdCloseBody : copy.unsavedBody}
        confirmLabel={copy.unsavedClose}
        onContinue={() => wizard.setConfirmClose(false)}
        onConfirm={finishClose}
      />
      <UnsavedChangesDialog
        open={wizard.confirmInvalidate}
        title={copy.invalidateTitle}
        body={copy.invalidateBody}
        confirmLabel={copy.unsavedClose}
        onContinue={() => wizard.setConfirmInvalidate(false)}
        onConfirm={wizard.confirmGoBack}
      />
      <UnsavedChangesDialog
        open={wizard.confirmRegenerate}
        title={copy.regenerateConfirmTitle}
        body={copy.regenerateConfirmBody}
        confirmLabel={copy.regenerateConfirm}
        cancelLabel={messages.common.actions.cancel}
        confirmTestId="confirm-regenerate-token"
        dialogTestId="regenerate-token-dialog"
        onContinue={() => wizard.setConfirmRegenerate(false)}
        onConfirm={() => void wizard.regenerate()}
      />
    </div>
  );

  if (!dialog) {
    return content;
  }

  return (
    <div className={styles.overlayRoot}>
      <button
        type="button"
        className={styles.backdrop}
        aria-label={copy.closeWizard}
        onClick={() => {
          if (wizard.dirty || wizard.needsConfirm) {
            return;
          }
          requestDismiss();
        }}
      />
      {content}
    </div>
  );
}

export { EnrollmentWizard as AddServerWizard };
