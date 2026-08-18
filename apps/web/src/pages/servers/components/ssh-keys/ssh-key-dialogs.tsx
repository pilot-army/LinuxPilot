import { useEffect, useRef, useState } from 'react';
import type { SshKey, SshKeyPreview, SshKeyAlgorithm } from '@linuxpilot/server-contracts';
import {
  addPublicSshKey,
  generateSshKey,
  importPrivateSshKey,
  inspectSshKey,
  updateSshKey,
} from '../../../../api/ssh-keys';
import { ApiRequestError } from '../../../../api/client';
import { interpolate } from '../../../../features/servers/format';
import { useI18n } from '../../../../i18n';
import { Button } from '../../../../shared/ui/button';
import { TextField } from '../../../../shared/ui/text-field';
import { GroupDialogShell } from '../groups/group-dialog-shell';
import styles from '../../server-ssh-keys-page.module.css';

type CreatedHandler = (key: SshKey) => void;

type ImportPrivateKeyDialogProps = {
  open: boolean;
  onClose: () => void;
  onCreated: CreatedHandler;
  onOpenExisting: (id: string) => void;
};

export function ImportPrivateKeyDialog({
  open,
  onClose,
  onCreated,
  onOpenExisting,
}: ImportPrivateKeyDialogProps) {
  const { messages } = useI18n();
  const copy = messages.servers.sshKeys;
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [privateKey, setPrivateKey] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [tags, setTags] = useState('');
  const [preview, setPreview] = useState<SshKeyPreview | null>(null);
  const [error, setError] = useState('');
  const [existingId, setExistingId] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) {
      setName('');
      setDescription('');
      setPrivateKey('');
      setPassphrase('');
      setTags('');
      setPreview(null);
      setError('');
      setExistingId('');
    }
  }, [open]);

  async function previewKey(value: string, secret?: string) {
    if (!value.trim()) {
      setPreview(null);
      return;
    }
    try {
      setPreview(await inspectSshKey({ privateKey: value, passphrase: secret || undefined }));
      setError('');
    } catch (cause) {
      setPreview(null);
      setError(cause instanceof Error ? cause.message : copy.keyRequired);
    }
  }

  async function submit() {
    if (!name.trim() || !privateKey.trim()) {
      setError(!name.trim() ? copy.nameRequired : copy.keyRequired);
      return;
    }
    setBusy(true);
    try {
      const created = await importPrivateSshKey({
        name: name.trim(),
        description: description.trim(),
        privateKey,
        passphrase: passphrase || undefined,
        tags: tags.split(/[\s,]+/).filter(Boolean),
      });
      setPrivateKey('');
      setPassphrase('');
      onCreated(created);
      onClose();
    } catch (cause) {
      if (cause instanceof ApiRequestError && cause.code === 'SSH_KEY_DUPLICATE') {
        const detail = cause.details[0] as
          | { existingId?: string; existingName?: string }
          | undefined;
        setExistingId(detail?.existingId ?? '');
        setError(interpolate(copy.duplicate, { name: detail?.existingName ?? '' }));
      } else {
        setError(cause instanceof Error ? cause.message : copy.loadError);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <GroupDialogShell
      open={open}
      title={copy.importTitle}
      subtitle={copy.importSubtitle}
      testId="import-private-key"
      onClose={onClose}
      footer={
        <div className={styles.toolbar}>
          {existingId ? (
            <Button variant="secondary" onClick={() => onOpenExisting(existingId)}>
              {copy.openExisting}
            </Button>
          ) : null}
          <Button variant="secondary" onClick={onClose}>
            {copy.cancel}
          </Button>
          <Button loading={busy} onClick={() => void submit()}>
            {copy.save}
          </Button>
        </div>
      }
    >
      <KeyMaterialForm
        name={name}
        description={description}
        keyValue={privateKey}
        keyLabel={copy.privateKey}
        passphrase={passphrase}
        tags={tags}
        error={error}
        preview={preview}
        onName={setName}
        onDescription={setDescription}
        onKey={(value) => {
          setPrivateKey(value);
          void previewKey(value, passphrase);
        }}
        onPassphrase={(value) => {
          setPassphrase(value);
          void previewKey(privateKey, value);
        }}
        onTags={setTags}
        onFile={(value) => {
          setPrivateKey(value);
          void previewKey(value, passphrase);
        }}
      />
    </GroupDialogShell>
  );
}

type AddPublicKeyDialogProps = {
  open: boolean;
  onClose: () => void;
  onCreated: CreatedHandler;
  onOpenExisting: (id: string) => void;
};

export function AddPublicKeyDialog({
  open,
  onClose,
  onCreated,
  onOpenExisting,
}: AddPublicKeyDialogProps) {
  const { messages } = useI18n();
  const copy = messages.servers.sshKeys;
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [publicKey, setPublicKey] = useState('');
  const [tags, setTags] = useState('');
  const [preview, setPreview] = useState<SshKeyPreview | null>(null);
  const [error, setError] = useState('');
  const [existingId, setExistingId] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) {
      setName('');
      setDescription('');
      setPublicKey('');
      setTags('');
      setPreview(null);
      setError('');
      setExistingId('');
    }
  }, [open]);

  async function submit() {
    if (!name.trim() || !publicKey.trim()) {
      setError(!name.trim() ? copy.nameRequired : copy.keyRequired);
      return;
    }
    setBusy(true);
    try {
      const created = await addPublicSshKey({
        name: name.trim(),
        description: description.trim(),
        publicKey,
        tags: tags.split(/[\s,]+/).filter(Boolean),
      });
      setPublicKey('');
      onCreated(created);
      onClose();
    } catch (cause) {
      if (cause instanceof ApiRequestError && cause.code === 'SSH_KEY_DUPLICATE') {
        const detail = cause.details[0] as
          | { existingId?: string; existingName?: string }
          | undefined;
        setExistingId(detail?.existingId ?? '');
        setError(interpolate(copy.duplicate, { name: detail?.existingName ?? '' }));
      } else {
        setError(cause instanceof Error ? cause.message : copy.loadError);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <GroupDialogShell
      open={open}
      title={copy.publicTitle}
      subtitle={copy.publicSubtitle}
      testId="add-public-key"
      onClose={onClose}
      footer={
        <div className={styles.toolbar}>
          {existingId ? (
            <Button variant="secondary" onClick={() => onOpenExisting(existingId)}>
              {copy.openExisting}
            </Button>
          ) : null}
          <Button variant="secondary" onClick={onClose}>
            {copy.cancel}
          </Button>
          <Button loading={busy} onClick={() => void submit()}>
            {copy.save}
          </Button>
        </div>
      }
    >
      <KeyMaterialForm
        name={name}
        description={description}
        keyValue={publicKey}
        keyLabel={copy.publicKey}
        tags={tags}
        error={error}
        preview={preview}
        onName={setName}
        onDescription={setDescription}
        onKey={(value) => {
          setPublicKey(value);
          void inspectSshKey({ publicKey: value })
            .then(setPreview)
            .catch(() => setPreview(null));
        }}
        onTags={setTags}
        onFile={(value) => {
          setPublicKey(value);
          void inspectSshKey({ publicKey: value })
            .then(setPreview)
            .catch(() => setPreview(null));
        }}
      />
    </GroupDialogShell>
  );
}

type GenerateKeyPairDialogProps = {
  open: boolean;
  onClose: () => void;
  onCreated: CreatedHandler;
};

export function GenerateKeyPairDialog({ open, onClose, onCreated }: GenerateKeyPairDialogProps) {
  const { messages } = useI18n();
  const copy = messages.servers.sshKeys;
  const [name, setName] = useState('');
  const [algorithm, setAlgorithm] = useState<SshKeyAlgorithm>('ed25519');
  const [comment, setComment] = useState('');
  const [tags, setTags] = useState('');
  const [rsaBits, setRsaBits] = useState<3072 | 4096>(4096);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) {
      setName('');
      setAlgorithm('ed25519');
      setComment('');
      setTags('');
      setRsaBits(4096);
      setError('');
    }
  }, [open]);

  async function submit() {
    if (!name.trim()) {
      setError(copy.nameRequired);
      return;
    }
    setBusy(true);
    try {
      const created = await generateSshKey({
        name: name.trim(),
        algorithm,
        comment: comment.trim() || undefined,
        rsaBits: algorithm === 'rsa' ? rsaBits : undefined,
        tags: tags.split(/[\s,]+/).filter(Boolean),
      });
      onCreated(created);
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : copy.loadError);
    } finally {
      setBusy(false);
    }
  }

  return (
    <GroupDialogShell
      open={open}
      title={copy.generateTitle}
      subtitle={copy.generateSubtitle}
      testId="generate-key-pair"
      onClose={onClose}
      footer={
        <div className={styles.toolbar}>
          <Button variant="secondary" onClick={onClose}>
            {copy.cancel}
          </Button>
          <Button loading={busy} onClick={() => void submit()}>
            {copy.save}
          </Button>
        </div>
      }
    >
      <TextField
        name="gen-name"
        label={copy.name}
        requiredMark
        value={name}
        onChange={(event) => setName(event.target.value)}
      />
      <label className={styles.meta} htmlFor="gen-alg">
        {copy.algorithm}
      </label>
      <select
        id="gen-alg"
        className={styles.filterSelect}
        value={algorithm}
        onChange={(event) => setAlgorithm(event.target.value as SshKeyAlgorithm)}
      >
        <option value="ed25519">{copy.algorithms.ed25519}</option>
        <option value="rsa">{copy.algorithms.rsa}</option>
        <option value="ecdsa">{copy.algorithms.ecdsa}</option>
      </select>
      {algorithm === 'rsa' ? (
        <>
          <label className={styles.meta} htmlFor="gen-rsa">
            {copy.rsaBits}
          </label>
          <select
            id="gen-rsa"
            className={styles.filterSelect}
            value={rsaBits}
            onChange={(event) => setRsaBits(Number(event.target.value) as 3072 | 4096)}
          >
            <option value={4096}>4096</option>
            <option value={3072}>3072</option>
          </select>
          <p className={styles.meta}>{copy.rsaHint}</p>
        </>
      ) : null}
      <TextField
        name="gen-comment"
        label={copy.comment}
        value={comment}
        onChange={(event) => setComment(event.target.value)}
      />
      <TextField
        name="gen-tags"
        label={copy.tags}
        value={tags}
        onChange={(event) => setTags(event.target.value)}
      />
      {error ? <p role="alert">{error}</p> : null}
    </GroupDialogShell>
  );
}

type EditSshKeyDialogProps = {
  open: boolean;
  keyItem: SshKey | null;
  onClose: () => void;
  onSaved: (key: SshKey) => void;
};

export function EditSshKeyDialog({ open, keyItem, onClose, onSaved }: EditSshKeyDialogProps) {
  const { messages } = useI18n();
  const copy = messages.servers.sshKeys;
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setName(keyItem?.name ?? '');
    setDescription(keyItem?.description ?? '');
  }, [keyItem, open]);

  async function submit() {
    if (!keyItem || !name.trim()) {
      return;
    }
    setBusy(true);
    try {
      onSaved(
        await updateSshKey(keyItem.id, {
          name: name.trim(),
          description,
          version: keyItem.version,
        }),
      );
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <GroupDialogShell
      open={open}
      title={copy.editTitle}
      testId="edit-ssh-key"
      onClose={onClose}
      footer={
        <div className={styles.toolbar}>
          <Button variant="secondary" onClick={onClose}>
            {copy.cancel}
          </Button>
          <Button loading={busy} onClick={() => void submit()}>
            {copy.save}
          </Button>
        </div>
      }
    >
      <TextField
        name="edit-name"
        label={copy.name}
        requiredMark
        value={name}
        onChange={(event) => setName(event.target.value)}
      />
      <TextField
        name="edit-description"
        label={copy.description}
        value={description}
        onChange={(event) => setDescription(event.target.value)}
      />
    </GroupDialogShell>
  );
}

function KeyMaterialForm({
  name,
  description,
  keyValue,
  keyLabel,
  passphrase,
  tags,
  error,
  preview,
  onName,
  onDescription,
  onKey,
  onPassphrase,
  onTags,
  onFile,
}: {
  name: string;
  description: string;
  keyValue: string;
  keyLabel: string;
  passphrase?: string;
  tags: string;
  error: string;
  preview: SshKeyPreview | null;
  onName: (value: string) => void;
  onDescription: (value: string) => void;
  onKey: (value: string) => void;
  onPassphrase?: (value: string) => void;
  onTags: (value: string) => void;
  onFile: (value: string) => void;
}) {
  const { messages } = useI18n();
  const copy = messages.servers.sshKeys;
  const fileRef = useRef<HTMLInputElement>(null);
  const [caps, setCaps] = useState(false);
  const [showSecret, setShowSecret] = useState(false);

  return (
    <div className={styles.section}>
      <TextField
        name="ssh-key-name"
        label={copy.name}
        requiredMark
        value={name}
        onChange={(event) => onName(event.target.value)}
      />
      <TextField
        name="ssh-key-description"
        label={copy.description}
        value={description}
        onChange={(event) => onDescription(event.target.value)}
      />
      <label className={styles.meta} htmlFor="ssh-key-material">
        {keyLabel} *
      </label>
      <textarea
        id="ssh-key-material"
        className={styles.keyArea}
        value={keyValue}
        autoComplete="off"
        spellCheck={false}
        data-testid="ssh-key-material"
        onChange={(event) => onKey(event.target.value)}
      />
      <label className={styles.dropzone}>
        {copy.dropHint}
        <input
          ref={fileRef}
          type="file"
          accept=".pub,.pem,.key,text/plain"
          hidden
          onChange={async (event) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (!file) {
              return;
            }
            const text = await file.text();
            if (!/BEGIN |^ssh-|^ecdsa-/.test(text)) {
              return;
            }
            onFile(text);
          }}
        />
      </label>
      {onPassphrase ? (
        <div className={styles.passwordWrap}>
          <TextField
            name="ssh-passphrase"
            label={copy.passphrase}
            type={showSecret ? 'text' : 'password'}
            autoComplete="off"
            hint={copy.passphraseHint}
            value={passphrase}
            onChange={(event) => onPassphrase(event.target.value)}
            onKeyUp={(event) => setCaps(event.getModifierState('CapsLock'))}
          />
          <button
            type="button"
            className={styles.iconButton}
            aria-label={showSecret ? copy.hidePassphrase : copy.showPassphrase}
            onClick={() => setShowSecret((value) => !value)}
          >
            {showSecret ? copy.hidePassphrase : copy.showPassphrase}
          </button>
          {caps ? <p className={styles.warn}>{copy.capsLock}</p> : null}
        </div>
      ) : null}
      <TextField
        name="ssh-tags"
        label={copy.tags}
        value={tags}
        onChange={(event) => onTags(event.target.value)}
      />
      {preview ? (
        <div className={styles.preview} role="status">
          <strong>{copy.previewTitle}</strong>
          <span>
            {copy.previewAlgorithm}: {copy.algorithms[preview.algorithm]}
          </span>
          <span>
            {copy.previewFingerprint}: {preview.fingerprint}
          </span>
          <span>
            {copy.previewEncrypted}: {preview.encrypted ? copy.yes : copy.no}
          </span>
          <span>
            {copy.previewReady}: {preview.ready ? copy.yes : copy.no}
          </span>
        </div>
      ) : null}
      {error ? <p role="alert">{error}</p> : null}
    </div>
  );
}
