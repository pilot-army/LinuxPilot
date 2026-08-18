import { useEffect, useState } from 'react';
import type { SshKey, SshKeyServerResult } from '@linuxpilot/server-contracts';
import { deleteSshKey, installSshKey, rotateSshKey } from '../../../../api/ssh-keys';
import { listServers } from '../../../../api/servers';
import { interpolate } from '../../../../features/servers/format';
import { useI18n } from '../../../../i18n';
import { Button } from '../../../../shared/ui/button';
import { TextField } from '../../../../shared/ui/text-field';
import { ConfirmDialog } from '../confirm-dialog';
import { GroupDialogShell } from '../groups/group-dialog-shell';
import styles from '../../server-ssh-keys-page.module.css';

type ServerOption = { id: string; name: string };

type InstallKeyWizardProps = {
  open: boolean;
  sshKey: SshKey | null;
  onClose: () => void;
  onDone: () => void;
};

export function InstallKeyWizard({ open, sshKey, onClose, onDone }: InstallKeyWizardProps) {
  const { messages } = useI18n();
  const copy = messages.servers.sshKeys;
  const [servers, setServers] = useState<ServerOption[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [sshUser, setSshUser] = useState('linuxpilot');
  const [path, setPath] = useState('~/.ssh/authorized_keys');
  const [results, setResults] = useState<SshKeyServerResult[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }
    void listServers(new URLSearchParams({ pageSize: '100' })).then((result) => {
      setServers(result.items.map((item) => ({ id: item.id, name: item.name })));
    });
  }, [open]);

  async function submit() {
    if (!sshKey || selected.length === 0) {
      return;
    }
    setBusy(true);
    try {
      const response = await installSshKey(sshKey.id, {
        serverIds: selected,
        sshUser,
        authorizedKeysPath: path,
      });
      setResults(response.results ?? []);
      onDone();
    } finally {
      setBusy(false);
    }
  }

  return (
    <GroupDialogShell
      open={open}
      title={copy.installTitle}
      testId="install-key-wizard"
      onClose={onClose}
      footer={
        <div className={styles.toolbar}>
          <Button variant="secondary" onClick={onClose}>
            {copy.cancel}
          </Button>
          <Button loading={busy} onClick={() => void submit()}>
            {copy.installConfirm}
          </Button>
        </div>
      }
    >
      <fieldset>
        <legend>{copy.colUsage}</legend>
        {servers.map((server) => (
          <label key={server.id} className={styles.meta}>
            <input
              type="checkbox"
              checked={selected.includes(server.id)}
              onChange={() =>
                setSelected((current) =>
                  current.includes(server.id)
                    ? current.filter((id) => id !== server.id)
                    : [...current, server.id],
                )
              }
            />
            {server.name}
          </label>
        ))}
      </fieldset>
      <TextField
        name="install-user"
        label={copy.installUser}
        value={sshUser}
        onChange={(event) => setSshUser(event.target.value)}
      />
      <TextField
        name="install-path"
        label={copy.installPath}
        value={path}
        onChange={(event) => setPath(event.target.value)}
      />
      <p className={styles.meta}>{copy.installPreview}</p>
      {results.length > 0 ? (
        <ul>
          {results.map((item) => (
            <li key={item.serverId}>
              {item.name}: {item.status}
            </li>
          ))}
        </ul>
      ) : null}
    </GroupDialogShell>
  );
}

type RotateKeyWizardProps = {
  open: boolean;
  sshKey: SshKey | null;
  replacements: SshKey[];
  onClose: () => void;
  onDone: () => void;
};

export function RotateKeyWizard({
  open,
  sshKey,
  replacements,
  onClose,
  onDone,
}: RotateKeyWizardProps) {
  const { messages } = useI18n();
  const copy = messages.servers.sshKeys;
  const [replacementId, setReplacementId] = useState('');
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<SshKeyServerResult[]>([]);

  useEffect(() => {
    setReplacementId(replacements[0]?.id ?? '');
    setResults([]);
  }, [open, replacements]);

  async function submit() {
    if (!sshKey || !replacementId) {
      return;
    }
    setBusy(true);
    try {
      const response = await rotateSshKey(sshKey.id, { replacementKeyId: replacementId });
      setResults(response.results ?? []);
      onDone();
    } finally {
      setBusy(false);
    }
  }

  return (
    <GroupDialogShell
      open={open}
      title={copy.rotateTitle}
      testId="rotate-key-wizard"
      onClose={onClose}
      footer={
        <div className={styles.toolbar}>
          <Button variant="secondary" onClick={onClose}>
            {copy.cancel}
          </Button>
          <Button loading={busy} onClick={() => void submit()}>
            {copy.rotateConfirm}
          </Button>
        </div>
      }
    >
      <label className={styles.meta} htmlFor="rotate-replacement">
        {copy.rotateReplacement}
      </label>
      <select
        id="rotate-replacement"
        className={styles.filterSelect}
        value={replacementId}
        onChange={(event) => setReplacementId(event.target.value)}
      >
        {replacements
          .filter((item) => item.id !== sshKey?.id)
          .map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
      </select>
      {results.map((item) => (
        <p key={item.serverId}>
          {item.name}: {item.status}
        </p>
      ))}
    </GroupDialogShell>
  );
}

type DeleteSshKeyDialogProps = {
  open: boolean;
  sshKey: SshKey | null;
  onClose: () => void;
  onDeleted: () => void;
  onReplace: () => void;
};

export function DeleteSshKeyDialog({
  open,
  sshKey,
  onClose,
  onDeleted,
  onReplace,
}: DeleteSshKeyDialogProps) {
  const { messages } = useI18n();
  const copy = messages.servers.sshKeys;
  const inUse = (sshKey?.usage.servers ?? 0) + (sshKey?.usage.templates ?? 0) > 0;

  if (inUse) {
    return (
      <ConfirmDialog
        open={open}
        title={copy.deleteTitle}
        confirmLabel={copy.replace}
        testId="delete-ssh-key"
        onClose={onClose}
        onConfirm={onReplace}
        body={
          <p>
            {interpolate(copy.deleteInUse, {
              servers: String(sshKey?.usage.servers ?? 0),
              templates: String(sshKey?.usage.templates ?? 0),
            })}
          </p>
        }
      />
    );
  }

  return (
    <ConfirmDialog
      open={open}
      title={copy.deleteTitle}
      confirmLabel={copy.delete}
      danger
      testId="delete-ssh-key"
      onClose={onClose}
      onConfirm={async () => {
        if (!sshKey) {
          return;
        }
        await deleteSshKey(sshKey.id);
        onDeleted();
        onClose();
      }}
      body={<p>{interpolate(copy.deleteBody, { name: sshKey?.name ?? '' })}</p>}
    />
  );
}
