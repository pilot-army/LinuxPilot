import type { SshKey } from '@linuxpilot/server-contracts';
import { CopyIcon, KeyIcon, MoreIcon } from '../../../../features/dashboard/icons';
import { interpolate } from '../../../../features/servers/format';
import { useI18n } from '../../../../i18n';
import { DataTable } from '../data-table';
import { SshKeyStatusBadge } from './ssh-key-status-badge';
import styles from '../../server-ssh-keys-page.module.css';

type SshKeysTableProps = {
  items: SshKey[];
  activeId?: string;
  cards: boolean;
  onOpen: (id: string) => void;
  onUsage: (id: string) => void;
  onCopyFingerprint: (value: string) => void;
  onActions: (id: string) => void;
};

export function SshKeysTable({
  items,
  activeId,
  cards,
  onOpen,
  onUsage,
  onCopyFingerprint,
  onActions,
}: SshKeysTableProps) {
  const { locale, messages } = useI18n();
  const copy = messages.servers.sshKeys;

  if (cards) {
    return (
      <div className={styles.cards} data-testid="ssh-keys-cards">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            className={styles.card}
            data-testid={`ssh-key-card-${item.id}`}
            onClick={() => onOpen(item.id)}
          >
            <strong>{item.name}</strong>
            <span className={styles.meta}>
              {copy.types[item.type]} · {copy.algorithms[item.algorithm]}
            </span>
            <Fingerprint
              value={item.fingerprint}
              algorithm={copy.algorithms[item.algorithm]}
              onCopy={onCopyFingerprint}
            />
            <SshKeyStatusBadge status={item.status} />
          </button>
        ))}
      </div>
    );
  }

  return (
    <DataTable
      testId="ssh-keys-table"
      ariaLabel={copy.title}
      rows={items}
      activeId={activeId}
      onRowOpen={onOpen}
      columns={[
        {
          id: 'name',
          header: copy.colName,
          cell: (row) => (
            <div className={styles.nameCell}>
              <strong>
                <KeyIcon /> {row.name}
              </strong>
              <span className={styles.meta}>
                {row.description || sourceLabel(row.source, copy)}
              </span>
            </div>
          ),
        },
        {
          id: 'type',
          header: copy.colType,
          cell: (row) => copy.types[row.type],
        },
        {
          id: 'algorithm',
          header: copy.colAlgorithm,
          cell: (row) =>
            `${copy.algorithms[row.algorithm]}${row.keySize ? ` · ${row.keySize}` : ''}`,
        },
        {
          id: 'fingerprint',
          header: copy.colFingerprint,
          cell: (row) => (
            <Fingerprint
              value={row.fingerprint}
              algorithm={copy.algorithms[row.algorithm]}
              onCopy={onCopyFingerprint}
            />
          ),
        },
        {
          id: 'usage',
          header: copy.colUsage,
          cell: (row) => (
            <button
              type="button"
              className={styles.meta}
              onClick={(event) => {
                event.stopPropagation();
                onUsage(row.id);
              }}
            >
              {interpolate(copy.usageLine, {
                servers: String(row.usage.servers),
                spaces: String(row.usage.spaces),
              })}
            </button>
          ),
        },
        {
          id: 'lastUsed',
          header: copy.colLastUsed,
          cell: (row) => formatDate(row.lastUsedAt, locale, copy.never),
        },
        {
          id: 'created',
          header: copy.colCreated,
          cell: (row) => formatDate(row.createdAt, locale, copy.never),
        },
        {
          id: 'status',
          header: copy.colStatus,
          cell: (row) => <SshKeyStatusBadge status={row.status} />,
        },
        {
          id: 'actions',
          header: copy.colActions,
          cell: (row) => (
            <button
              type="button"
              className={styles.iconButton}
              aria-label={copy.actions}
              aria-haspopup="menu"
              data-testid={`ssh-key-actions-${row.id}`}
              onClick={(event) => {
                event.stopPropagation();
                onActions(row.id);
              }}
            >
              <MoreIcon />
            </button>
          ),
        },
      ]}
    />
  );
}

function Fingerprint({
  value,
  algorithm,
  onCopy,
}: {
  value: string;
  algorithm: string;
  onCopy: (value: string) => void;
}) {
  const { messages } = useI18n();
  const short = value.length > 24 ? `${value.slice(0, 20)}…` : value;
  return (
    <span className={styles.fingerprint}>
      <span
        title={value}
        aria-label={interpolate(messages.servers.sshKeys.fingerprintLabel, { value, algorithm })}
      >
        {short}
      </span>
      <button
        type="button"
        className={styles.copyButton}
        aria-label={messages.servers.sshKeys.copyFingerprint}
        onClick={(event) => {
          event.stopPropagation();
          onCopy(value);
        }}
      >
        <CopyIcon />
      </button>
    </span>
  );
}

function sourceLabel(
  source: string,
  copy: { sourceImport: string; sourceGenerate: string; sourcePublic: string },
) {
  if (source === 'generate') {
    return copy.sourceGenerate;
  }
  if (source === 'public') {
    return copy.sourcePublic;
  }
  return copy.sourceImport;
}

function formatDate(value: string | null, locale: string, fallback: string) {
  if (!value) {
    return fallback;
  }
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(value));
}
