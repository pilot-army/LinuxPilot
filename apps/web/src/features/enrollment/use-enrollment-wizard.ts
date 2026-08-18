import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ServerDetail, ServerSpace } from '@linuxpilot/server-contracts';
import { ApiRequestError } from '../../api/client';
import {
  createEnrollmentToken,
  createServer,
  getServer,
  listServerGroups,
  updateServer,
} from '../../api/servers';
import { POLL_HIDDEN_MS, POLL_LIMIT, POLL_MS } from './constants';
import { deriveConnection, tokenIsExpired } from './connection';
import { enrollmentErrorMessage, isOffline } from './errors';
import { canVisitStep, nextStep, previousStep, progressPercent } from './machine';
import {
  emptyForm,
  type CheckState,
  type EnrollmentSecret,
  type FieldErrors,
  type FieldKey,
  type WizardForm,
  type WizardPhase,
  type WizardStep,
} from './types';
import {
  applyAddress,
  canContinueAgentStep,
  canContinueConnection,
  canContinueStep1,
  isFormDirty,
  toCreatePayload,
  validateAddress,
  validateDescription,
  validateName,
  validateSshPort,
  validateSshUser,
  validateStep1,
  validateStep2,
  type WizardCopy,
} from './validation';

type ErrorCopy = { network: string; forbidden: string; generic: string };

type UseEnrollmentWizardOptions = {
  open: boolean;
  validation: WizardCopy;
  errors: ErrorCopy;
  initialStep?: WizardStep;
  initialSpaceId?: string;
  onIssued?: (preview: { command: string; expiresAt: string; createdAt: string }) => void;
  onConnected?: (serverId: string) => void;
};

export function useEnrollmentWizard({
  open,
  validation,
  errors,
  initialStep = 1,
  initialSpaceId,
  onIssued,
  onConnected,
}: UseEnrollmentWizardOptions) {
  const [step, setStep] = useState<WizardStep>(initialStep);
  const [maxReached, setMaxReached] = useState<WizardStep>(1);
  const [form, setForm] = useState<WizardForm>(() => ({
    ...emptyForm(),
    spaceId: initialSpaceId ?? '',
  }));
  const [baseline] = useState<WizardForm>(() => ({
    ...emptyForm(),
    spaceId: initialSpaceId ?? '',
  }));
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [serverId, setServerId] = useState<string | null>(null);
  const [server, setServer] = useState<ServerDetail | null>(null);
  const [secret, setSecret] = useState<EnrollmentSecret | null>(null);
  const [spaces, setSpaces] = useState<ServerSpace[]>([]);
  const [spacesStatus, setSpacesStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [timedOut, setTimedOut] = useState(false);
  const [pollError, setPollError] = useState(false);
  const [agentNotReady, setAgentNotReady] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const [confirmInvalidate, setConfirmInvalidate] = useState(false);
  const [confirmRegenerate, setConfirmRegenerate] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [tokenCreated, setTokenCreated] = useState(false);
  const [pendingStep, setPendingStep] = useState<WizardStep | null>(null);
  const [errorStep, setErrorStep] = useState<WizardStep | null>(null);
  const [connectionCheck, setConnectionCheck] = useState<CheckState>('idle');
  const [compatCheck, setCompatCheck] = useState<CheckState>('idle');
  const [phase, setPhase] = useState<WizardPhase>('form');
  const pollsRef = useRef(0);
  const inFlight = useRef(false);
  const actionRef = useRef(false);
  const snapshotRef = useRef<ReturnType<typeof toCreatePayload> | null>(null);
  const connectedRef = useRef(false);
  const preflightAbort = useRef<AbortController | null>(null);
  const compatAbort = useRef<AbortController | null>(null);

  const dirty = isFormDirty(form, baseline);
  const hasSecret = Boolean(secret);
  const needsConfirm = dirty || hasSecret || Boolean(serverId);

  const connection = useMemo(
    () => deriveConnection({ server, secret, timedOut, pollError }),
    [server, secret, timedOut, pollError],
  );

  const percent = progressPercent(
    step,
    connection.outcome === 'connected' || connection.outcome === 'metrics',
    connection.outcome === 'metrics',
  );

  const reset = useCallback(() => {
    preflightAbort.current?.abort();
    compatAbort.current?.abort();
    setStep(initialStep);
    setMaxReached(1);
    setForm({ ...emptyForm(), spaceId: initialSpaceId ?? '' });
    setFieldErrors({});
    setApiError(null);
    setBusy(false);
    setServerId(null);
    setServer(null);
    setSecret(null);
    setTimedOut(false);
    setPollError(false);
    setAgentNotReady(false);
    setConfirmClose(false);
    setConfirmInvalidate(false);
    setConfirmRegenerate(false);
    setRegenerating(false);
    setTokenCreated(false);
    setPendingStep(null);
    setErrorStep(null);
    setConnectionCheck('idle');
    setCompatCheck('idle');
    setPhase('form');
    pollsRef.current = 0;
    snapshotRef.current = null;
    connectedRef.current = false;
    actionRef.current = false;
  }, [initialStep, initialSpaceId]);

  const loadSpaces = useCallback(() => {
    setSpacesStatus('loading');
    return listServerGroups()
      .then((result) => {
        setSpaces(result.items);
        setSpacesStatus('success');
        return result.items;
      })
      .catch(() => {
        setSpacesStatus('error');
        return [] as ServerSpace[];
      });
  }, []);

  useEffect(() => {
    if (!open) {
      reset();
    }
  }, [open, reset]);

  useEffect(() => {
    if (!open) {
      return;
    }
    void loadSpaces();
  }, [open, loadSpaces]);

  useEffect(() => {
    if (!tokenCreated) {
      return;
    }
    const timer = window.setTimeout(() => setTokenCreated(false), 3000);
    return () => window.clearTimeout(timer);
  }, [tokenCreated]);

  useEffect(() => {
    if (
      phase !== 'waiting_heartbeat' ||
      (connection.outcome !== 'connected' && connection.outcome !== 'metrics')
    ) {
      return;
    }
    setPhase('success');
    setAgentNotReady(false);
  }, [connection.outcome, phase]);

  useEffect(() => {
    if (phase === 'waiting_heartbeat' && timedOut) {
      setPhase('partial_success');
    }
  }, [phase, timedOut]);

  const applyServer = useCallback((next: ServerDetail) => {
    setServer(next);
    setPollError(false);
  }, []);

  useEffect(() => {
    if (!open || !serverId || phase !== 'waiting_heartbeat' || timedOut) {
      return;
    }
    if (connection.outcome === 'metrics' || connection.outcome === 'revoked') {
      return;
    }
    let cancelled = false;
    let timer = 0;

    async function tick() {
      if (cancelled || inFlight.current || !serverId) {
        return;
      }
      inFlight.current = true;
      try {
        const next = await getServer(serverId);
        if (!cancelled) {
          applyServer(next);
          pollsRef.current += 1;
          if (
            pollsRef.current >= POLL_LIMIT &&
            next.status !== 'ONLINE' &&
            next.status !== 'DEGRADED'
          ) {
            setTimedOut(true);
          }
        }
      } catch {
        if (!cancelled) {
          setPollError(true);
        }
      } finally {
        inFlight.current = false;
      }
    }

    function schedule() {
      const delay = document.hidden ? POLL_HIDDEN_MS : POLL_MS;
      timer = window.setTimeout(() => {
        void tick().then(() => {
          if (!cancelled) {
            schedule();
          }
        });
      }, delay);
    }

    void tick().then(() => {
      if (!cancelled) {
        schedule();
      }
    });

    function onVisibility() {
      if (!document.hidden) {
        void tick();
      }
    }
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [open, serverId, phase, timedOut, applyServer, connection.outcome]);

  useEffect(() => {
    if (
      !serverId ||
      connectedRef.current ||
      (connection.outcome !== 'connected' && connection.outcome !== 'metrics')
    ) {
      return;
    }
    connectedRef.current = true;
    onConnected?.(serverId);
  }, [connection.outcome, onConnected, serverId]);

  function setField<K extends keyof WizardForm>(key: K, value: WizardForm[K]) {
    if (
      key === 'address' ||
      key === 'sshPort' ||
      key === 'sshUser' ||
      key === 'useSudo' ||
      key === 'fingerprintCheck'
    ) {
      preflightAbort.current?.abort();
      setConnectionCheck('idle');
    }
    if (
      key === 'installMode' ||
      key === 'metricsEnabled' ||
      key === 'remoteControl' ||
      key === 'updateChannel'
    ) {
      compatAbort.current?.abort();
      setCompatCheck('idle');
    }
    setForm((current) => {
      if (key === 'address' && typeof value === 'string') {
        const resolved = applyAddress(value);
        return {
          ...current,
          address: value,
          hostname: resolved.hostname,
          primaryIp: resolved.primaryIp,
        };
      }
      return { ...current, [key]: value };
    });
    if (key in fieldErrors) {
      setFieldErrors((current) => {
        const next = { ...current };
        delete next[key as FieldKey];
        return next;
      });
    }
  }

  function setTagError(error?: string) {
    setFieldErrors((current) => {
      const next = { ...current };
      if (error) {
        next.tags = error;
      } else {
        delete next.tags;
      }
      return next;
    });
  }

  function blurField(key: FieldKey) {
    if (key === 'name') {
      setFieldErrors((current) => ({ ...current, name: validateName(form.name, validation) }));
    }
    if (key === 'address') {
      setFieldErrors((current) => ({
        ...current,
        address: validateAddress(form.address, validation),
      }));
    }
    if (key === 'sshPort') {
      setFieldErrors((current) => ({
        ...current,
        sshPort: validateSshPort(form.sshPort, validation),
      }));
    }
    if (key === 'sshUser') {
      setFieldErrors((current) => ({
        ...current,
        sshUser: validateSshUser(form.sshUser, validation),
      }));
    }
    if (key === 'description') {
      setFieldErrors((current) => ({
        ...current,
        description: validateDescription(form.description, validation),
      }));
    }
  }

  function goTo(target: WizardStep) {
    if (!canVisitStep(target, maxReached)) {
      return;
    }
    if (secret && target < 4 && phase !== 'form') {
      setPendingStep(target);
      setConfirmInvalidate(true);
      return;
    }
    setStep(target);
    setApiError(null);
  }

  function confirmGoBack() {
    setSecret(null);
    setConfirmInvalidate(false);
    setAgentNotReady(false);
    setPhase('form');
    if (pendingStep) {
      setStep(pendingStep);
      setPendingStep(null);
    }
  }

  async function issueToken(id: string) {
    const enrollment = await createEnrollmentToken(id);
    const next: EnrollmentSecret = {
      token: enrollment.token,
      enrollCommand: enrollment.enrollCommand,
      installCommand: enrollment.installCommand,
      expiresAt: enrollment.expiresAt,
    };
    setSecret(next);
    onIssued?.({
      command: enrollment.enrollCommand,
      expiresAt: enrollment.expiresAt,
      createdAt: new Date().toISOString(),
    });
    return next;
  }

  async function persistServer() {
    const payload = toCreatePayload(form);
    if (serverId) {
      const previous = snapshotRef.current;
      const changed =
        !previous ||
        previous.name !== payload.name ||
        previous.description !== payload.description ||
        previous.hostname !== payload.hostname ||
        previous.primaryIp !== payload.primaryIp ||
        previous.spaceId !== payload.spaceId ||
        previous.tags.join('\0') !== payload.tags.join('\0') ||
        previous.autoDetectSystem !== payload.autoDetectSystem ||
        previous.osName !== payload.osName ||
        previous.osVersion !== payload.osVersion ||
        previous.architecture !== payload.architecture ||
        previous.sshKeyId !== payload.sshKeyId;
      if (changed) {
        const updated = await updateServer(serverId, {
          name: payload.name,
          description: payload.description,
          hostname: payload.hostname ?? null,
          ...(payload.primaryIp !== undefined || previous?.primaryIp !== undefined
            ? { primaryIp: payload.primaryIp ?? null }
            : {}),
          spaceId: payload.spaceId ?? null,
          tags: payload.tags,
          autoDetectSystem: payload.autoDetectSystem,
          osName: payload.autoDetectSystem ? null : (payload.osName ?? null),
          osVersion: payload.autoDetectSystem ? null : (payload.osVersion ?? null),
          architecture: payload.autoDetectSystem ? null : (payload.architecture ?? null),
          sshKeyId: payload.sshKeyId ?? null,
        });
        setServer(updated);
        snapshotRef.current = payload;
      }
      return serverId;
    }
    const created = await createServer(payload);
    setServerId(created.id);
    setServer(created);
    snapshotRef.current = payload;
    return created.id;
  }

  async function advance(): Promise<boolean> {
    if (busy || actionRef.current || phase !== 'form') {
      return false;
    }
    setApiError(null);
    if (step === 1) {
      const nextErrors = validateStep1(form, validation);
      setFieldErrors(nextErrors);
      if (Object.keys(nextErrors).length > 0) {
        setErrorStep(1);
        return false;
      }
      setErrorStep(null);
      const next = nextStep(step);
      setStep(next);
      setMaxReached((current) => (next > current ? next : current));
      return true;
    }
    if (step === 2) {
      const nextErrors = validateStep2(form, validation);
      setFieldErrors(nextErrors);
      if (Object.keys(nextErrors).length > 0 || connectionCheck === 'error') {
        setErrorStep(2);
        return false;
      }
      if (connectionCheck !== 'success' && connectionCheck !== 'warning') {
        return false;
      }
      setErrorStep(null);
      const next = nextStep(step);
      setStep(next);
      setMaxReached((current) => (next > current ? next : current));
      return true;
    }
    if (step === 3) {
      if (!canContinueAgentStep(form, compatCheck)) {
        setErrorStep(3);
        return false;
      }
      setErrorStep(null);
      const next = nextStep(step);
      setStep(next);
      setMaxReached((current) => (next > current ? next : current));
      return true;
    }
    if (step === 4) {
      return submitWizard();
    }
    return true;
  }

  async function submitWizard(): Promise<boolean> {
    if (!form.confirmAdd || busy || actionRef.current) {
      return false;
    }
    if (isOffline()) {
      setApiError(errors.network);
      setErrorStep(4);
      setPhase('error');
      return false;
    }
    actionRef.current = true;
    setBusy(true);
    setPhase('creating_server');
    try {
      const id = await persistServer();
      if (form.installMode !== 'none') {
        setPhase('installing_agent');
        if (!secret || tokenIsExpired(secret.expiresAt)) {
          await issueToken(id);
        }
      }
      setErrorStep(null);
      if (form.installMode === 'auto') {
        setPhase('waiting_heartbeat');
      } else if (form.installMode === 'none') {
        setPhase('partial_success');
      } else {
        setPhase('success');
      }
      return true;
    } catch (cause) {
      if (cause instanceof ApiRequestError && cause.status === 409) {
        setFieldErrors((current) => ({ ...current, name: validation.nameTaken }));
      }
      setApiError(enrollmentErrorMessage(cause, errors));
      setErrorStep(4);
      setPhase(snapshotRef.current ? 'partial_success' : 'error');
      return false;
    } finally {
      actionRef.current = false;
      setBusy(false);
    }
  }

  function runConnectionPreflight() {
    preflightAbort.current?.abort();
    const controller = new AbortController();
    preflightAbort.current = controller;
    const nextErrors = validateStep2(form, validation);
    setFieldErrors(nextErrors);
    if (
      Object.keys(nextErrors).length > 0 ||
      Object.keys(validateStep1(form, validation)).length > 0
    ) {
      setConnectionCheck('error');
      return;
    }
    setConnectionCheck('testing');
    window.setTimeout(() => {
      if (controller.signal.aborted) {
        return;
      }
      setConnectionCheck(form.fingerprintCheck ? 'success' : 'warning');
    }, 420);
  }

  function cancelConnectionPreflight() {
    preflightAbort.current?.abort();
    setConnectionCheck('idle');
  }

  function runCompatCheck() {
    compatAbort.current?.abort();
    const controller = new AbortController();
    compatAbort.current = controller;
    setCompatCheck('testing');
    window.setTimeout(() => {
      if (controller.signal.aborted) {
        return;
      }
      setCompatCheck('success');
    }, 420);
  }

  function cancelCompatCheck() {
    compatAbort.current?.abort();
    setCompatCheck('idle');
  }

  function back() {
    if (step === 1) {
      return;
    }
    goTo(previousStep(step));
  }

  async function regenerate() {
    if (!serverId || regenerating) {
      return;
    }
    setRegenerating(true);
    setApiError(null);
    setTokenCreated(false);
    setConfirmRegenerate(false);
    try {
      await issueToken(serverId);
      setTokenCreated(true);
    } catch (cause) {
      setApiError(enrollmentErrorMessage(cause, errors));
    } finally {
      setRegenerating(false);
    }
  }

  function requestRegenerate() {
    if (regenerating) {
      return;
    }
    if (!secret) {
      void regenerate();
      return;
    }
    setConfirmRegenerate(true);
  }

  async function retryPoll() {
    if (!serverId) {
      return;
    }
    setTimedOut(false);
    setPollError(false);
    setAgentNotReady(false);
    pollsRef.current = 0;
    setPhase(form.installMode === 'auto' ? 'waiting_heartbeat' : 'success');
    try {
      applyServer(await getServer(serverId));
    } catch {
      setPollError(true);
    }
  }

  async function retryAgent() {
    if (!serverId || busy || actionRef.current) {
      return;
    }
    actionRef.current = true;
    setBusy(true);
    setApiError(null);
    setPhase('installing_agent');
    try {
      await issueToken(serverId);
      setTimedOut(false);
      pollsRef.current = 0;
      setPhase(form.installMode === 'manual' ? 'success' : 'waiting_heartbeat');
    } catch (cause) {
      setApiError(enrollmentErrorMessage(cause, errors));
      setPhase('partial_success');
    } finally {
      actionRef.current = false;
      setBusy(false);
    }
  }

  function requestClose() {
    if (!needsConfirm) {
      return true;
    }
    setConfirmClose(true);
    return false;
  }

  function returnToForm() {
    setPhase('form');
    setApiError(null);
    setBusy(false);
    actionRef.current = false;
  }

  function selectCreatedSpace(id: string) {
    setField('spaceId', id);
    void loadSpaces();
  }

  return {
    step,
    maxReached,
    form,
    fieldErrors,
    apiError,
    busy,
    serverId,
    server,
    secret,
    spaces,
    spacesStatus,
    timedOut,
    pollError,
    agentNotReady,
    confirmClose,
    confirmInvalidate,
    confirmRegenerate,
    regenerating,
    tokenCreated,
    errorStep,
    connection,
    connectionCheck,
    compatCheck,
    phase,
    percent,
    dirty,
    needsConfirm,
    setField,
    setTagError,
    blurField,
    goTo,
    advance,
    back,
    regenerate,
    requestRegenerate,
    retryPoll,
    retryAgent,
    requestClose,
    returnToForm,
    setConfirmClose,
    confirmGoBack,
    setConfirmInvalidate,
    setConfirmRegenerate,
    selectCreatedSpace,
    loadSpaces,
    runConnectionPreflight,
    cancelConnectionPreflight,
    runCompatCheck,
    cancelCompatCheck,
    canContinueStep1: canContinueStep1(form, validation),
    canContinueStep2: canContinueConnection(form, validation, connectionCheck),
    canContinueStep3: canContinueAgentStep(form, compatCheck),
    reset,
  };
}
