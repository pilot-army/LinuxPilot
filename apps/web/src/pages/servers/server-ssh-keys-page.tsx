import { useCallback, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PERMISSIONS } from '@linuxpilot/auth-contracts';
import type { SshKey, SshKeyDetail } from '@linuxpilot/server-contracts';
import { disableSshKey, getSshKey } from '../../api/ssh-keys';
import { usePermission } from '../../auth/use-permission';
import { ChevronDownIcon, PlusIcon } from '../../features/dashboard/icons';
import { useMediaQuery } from '../../features/dashboard/use-media-query';
import { parseSshKeysQuery, serializeSshKeysQuery } from '../../features/ssh-keys/query';
import { useSshKeys } from '../../features/ssh-keys/use-ssh-keys';
import type { SshKeyDialog, SshKeysQueryState } from '../../features/ssh-keys/types';
import { useI18n } from '../../i18n';
import { AnchoredPopover } from '../../shared/ui/anchored-popover';
import { Button } from '../../shared/ui/button';
import { Toast } from './components/confirm-dialog';
import { ErrorState, FilteredEmptyState, LoadingSkeleton } from './components/empty-state';
import { FilterButton } from './components/filter-button';
import { RefreshButton } from './components/refresh-button';
import { SearchInput } from './components/search-input';
import { ServerPageHeader } from './components/server-page-header';
import { ServerSectionLayout } from './components/server-section-layout';
import { SyncStatus } from './components/sync-status';
import {
  AddPublicKeyDialog,
  EditSshKeyDialog,
  GenerateKeyPairDialog,
  ImportPrivateKeyDialog,
} from './components/ssh-keys/ssh-key-dialogs';
import { SshKeyDetails } from './components/ssh-keys/ssh-key-details';
import {
  DeleteSshKeyDialog,
  InstallKeyWizard,
  RotateKeyWizard,
} from './components/ssh-keys/ssh-key-wizards';
import { SshKeysEmptyState } from './components/ssh-keys/ssh-keys-empty-state';
import { SshKeysTable } from './components/ssh-keys/ssh-keys-table';
import pageStyles from './server-section.module.css';
import styles from './server-ssh-keys-page.module.css';

export function ServerSshKeysPage() {
  const { messages } = useI18n();
  const copy = messages.servers.sshKeys;
  const canRead = usePermission(PERMISSIONS.SSH_KEYS_READ);
  const canCreate = usePermission(PERMISSIONS.SSH_KEYS_CREATE);
  const canUpdate = usePermission(PERMISSIONS.SSH_KEYS_UPDATE);
  const canDelete = usePermission(PERMISSIONS.SSH_KEYS_DELETE);
  const canInstall = usePermission(PERMISSIONS.SSH_KEYS_INSTALL);
  const canRotate = usePermission(PERMISSIONS.SSH_KEYS_ROTATE);
  const canDisable = usePermission(PERMISSIONS.SSH_KEYS_DISABLE);
  const [searchParams, setSearchParams] = useSearchParams();
  const query = useMemo(() => parseSshKeysQuery(searchParams), [searchParams]);
  const list = useSshKeys(query);
  const [dialog, setDialog] = useState<SshKeyDialog>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [actionsId, setActionsId] = useState('');
  const [detail, setDetail] = useState<SshKeyDetail | null>(null);
  const [toast, setToast] = useState('');
  const addRef = useRef<HTMLButtonElement>(null);
  const isMobile = useMediaQuery('(max-width: 767px)');

  const patchQuery = useCallback(
    (patch: Partial<typeof query>) => {
      setSearchParams(serializeSshKeysQuery({ ...query, ...patch }), { replace: true });
    },
    [query, setSearchParams],
  );

  const selected = list.items.find((item) => item.id === (actionsId || query.keyId)) ?? null;
  const hasFilters = Boolean(
    query.q || query.type || query.algorithm || query.status || query.usage !== 'all',
  );
  const isInitialLoading = list.status === 'loading' && !list.lastSuccessfulAt;
  const isError = list.status === 'error' && !list.lastSuccessfulAt;

  async function openKey(id: string) {
    patchQuery({ keyId: id });
    setDetail(await getSshKey(id));
  }

  function onCreated(key: SshKey) {
    setToast(copy.toastCreated);
    void list.refresh();
    void openKey(key.id);
  }

  if (!canRead) {
    return (
      <ServerSectionLayout>
        <p role="alert">{copy.forbidden}</p>
      </ServerSectionLayout>
    );
  }

  const liveMessage = list.refreshing
    ? messages.servers.list.refreshing
    : isInitialLoading
      ? messages.common.status.loading
      : toast;

  return (
    <ServerSectionLayout liveMessage={liveMessage} testId="ssh-keys-page" busy={list.refreshing}>
      <div className={`${pageStyles.page} ${styles.page}`}>
        <ServerPageHeader
          crumbs={[{ label: copy.crumbServers }, { label: copy.title, current: true }]}
          title={copy.title}
          subtitle={copy.subtitle}
          sync={
            <SyncStatus
              lastSuccessfulAt={list.lastSuccessfulAt}
              refreshing={list.refreshing}
              failed={list.status === 'error'}
              testId="ssh-keys-sync"
            />
          }
          actions={
            <>
              <RefreshButton
                refreshing={list.refreshing}
                onRefresh={() => void list.refresh()}
                testId="ssh-keys-refresh"
              />
              {canCreate ? (
                <div className={styles.splitButton}>
                  <button
                    type="button"
                    className={styles.splitMain}
                    data-testid="add-ssh-key"
                    onClick={() => setDialog('import')}
                  >
                    <PlusIcon />
                    {copy.add}
                  </button>
                  <button
                    ref={addRef}
                    type="button"
                    className={styles.splitChevron}
                    aria-label={copy.addMenu}
                    aria-haspopup="menu"
                    aria-expanded={menuOpen}
                    data-testid="add-ssh-key-menu"
                    onClick={() => setMenuOpen((value) => !value)}
                  >
                    <ChevronDownIcon />
                  </button>
                  <AnchoredPopover
                    open={menuOpen}
                    onClose={() => setMenuOpen(false)}
                    anchorRef={addRef}
                    role="menu"
                    className={styles.menuPopover}
                  >
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setMenuOpen(false);
                        setDialog('import');
                      }}
                    >
                      {copy.importPrivate}
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setMenuOpen(false);
                        setDialog('public');
                      }}
                    >
                      {copy.addPublic}
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setMenuOpen(false);
                        setDialog('generate');
                      }}
                    >
                      {copy.generate}
                    </button>
                  </AnchoredPopover>
                </div>
              ) : null}
            </>
          }
        />

        {isInitialLoading ? <LoadingSkeleton testId="ssh-keys-skeleton" /> : null}
        {isError ? (
          <ErrorState
            title={copy.loadError}
            body={
              list.error === 'forbidden'
                ? copy.forbidden
                : list.error === 'network'
                  ? messages.servers.list.networkError
                  : copy.loadError
            }
            retryLabel={copy.retry}
            onRetry={() => void list.refresh()}
            testId="ssh-keys-error"
          />
        ) : null}
        {!isInitialLoading && !isError && list.summary.total === 0 ? (
          <SshKeysEmptyState
            canCreate={canCreate}
            onImport={() => setDialog('import')}
            onGenerate={() => setDialog('generate')}
            onPublic={() => setDialog('public')}
          />
        ) : null}
        {!isInitialLoading && !isError && list.summary.total > 0 ? (
          <>
            <section
              className={styles.summary}
              aria-label={copy.title}
              data-testid="ssh-keys-summary"
            >
              <SummaryStat label={copy.summaryTotal} value={list.summary.total} />
              <SummaryStat label={copy.summaryUsed} value={list.summary.used} />
              <SummaryStat label={copy.summaryUnused} value={list.summary.unused} />
              <SummaryStat label={copy.summaryAttention} value={list.summary.attention} />
              <SummaryStat label={copy.summaryRotation} value={list.summary.rotationDue} />
              <SummaryStat label={copy.summaryPassword} value={list.summary.passwordAuthServers} />
            </section>
            <div className={styles.toolbar}>
              <SearchInput
                value={query.q}
                placeholder={copy.search}
                label={copy.search}
                testId="ssh-keys-search"
                onChange={(value) => patchQuery({ q: value })}
              />
              {isMobile ? (
                <FilterButton onClick={() => setFiltersOpen(true)} testId="ssh-keys-filters" />
              ) : (
                <Filters query={query} onChange={patchQuery} />
              )}
            </div>
            {list.items.length === 0 ? (
              <FilteredEmptyState
                title={copy.filteredTitle}
                body={copy.filteredTitle}
                action={
                  hasFilters ? (
                    <Button
                      variant="secondary"
                      onClick={() =>
                        patchQuery({ q: '', type: '', algorithm: '', status: '', usage: 'all' })
                      }
                    >
                      {copy.resetFilters}
                    </Button>
                  ) : null
                }
                testId="ssh-keys-filtered-empty"
              />
            ) : (
              <SshKeysTable
                items={list.items}
                activeId={query.keyId}
                cards={isMobile}
                onOpen={(id) => void openKey(id)}
                onUsage={(id) => void openKey(id)}
                onCopyFingerprint={(value) => void navigator.clipboard.writeText(value)}
                onActions={setActionsId}
              />
            )}
          </>
        ) : null}
      </div>

      {filtersOpen ? (
        <div
          className={styles.filtersSheet}
          role="dialog"
          aria-modal="true"
          aria-label={copy.filters}
        >
          <Filters query={query} onChange={patchQuery} />
          <Button onClick={() => setFiltersOpen(false)}>{copy.save}</Button>
        </div>
      ) : null}

      {actionsId && selected ? (
        <div
          className={isMobile ? styles.actionsSheet : styles.menuPopover}
          role="menu"
          aria-label={copy.actions}
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              void openKey(selected.id);
              setActionsId('');
            }}
          >
            {copy.open}
          </button>
          {canUpdate ? (
            <button type="button" role="menuitem" onClick={() => setDialog('edit')}>
              {copy.edit}
            </button>
          ) : null}
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              void navigator.clipboard.writeText(selected.publicKey);
              setToast(copy.toastCopied);
              setActionsId('');
            }}
          >
            {copy.copyPublic}
          </button>
          {canInstall ? (
            <button type="button" role="menuitem" onClick={() => setDialog('install')}>
              {copy.install}
            </button>
          ) : null}
          {canRotate ? (
            <button type="button" role="menuitem" onClick={() => setDialog('rotate')}>
              {copy.rotate}
            </button>
          ) : null}
          {canDisable ? (
            <button
              type="button"
              role="menuitem"
              onClick={async () => {
                await disableSshKey(selected.id);
                setToast(copy.toastDisabled);
                setActionsId('');
                await list.refresh();
              }}
            >
              {copy.disable}
            </button>
          ) : null}
          {canDelete ? (
            <button type="button" role="menuitem" onClick={() => setDialog('delete')}>
              {copy.delete}
            </button>
          ) : null}
        </div>
      ) : null}

      <SshKeyDetails
        open={Boolean(query.keyId && detail)}
        sheet={isMobile}
        detail={detail}
        onClose={() => {
          patchQuery({ keyId: '' });
          setDetail(null);
        }}
        onCopyPublic={() => {
          if (detail) {
            void navigator.clipboard.writeText(detail.publicKey);
            setToast(copy.toastCopied);
          }
        }}
      />

      <ImportPrivateKeyDialog
        open={dialog === 'import'}
        onClose={() => setDialog(null)}
        onCreated={onCreated}
        onOpenExisting={(id) => {
          setDialog(null);
          void openKey(id);
        }}
      />
      <AddPublicKeyDialog
        open={dialog === 'public'}
        onClose={() => setDialog(null)}
        onCreated={onCreated}
        onOpenExisting={(id) => {
          setDialog(null);
          void openKey(id);
        }}
      />
      <GenerateKeyPairDialog
        open={dialog === 'generate'}
        onClose={() => setDialog(null)}
        onCreated={onCreated}
      />
      <EditSshKeyDialog
        open={dialog === 'edit'}
        keyItem={selected}
        onClose={() => setDialog(null)}
        onSaved={() => {
          setToast(copy.toastUpdated);
          void list.refresh();
        }}
      />
      <InstallKeyWizard
        open={dialog === 'install'}
        sshKey={selected}
        onClose={() => setDialog(null)}
        onDone={() => {
          setToast(copy.toastInstalled);
          void list.refresh();
        }}
      />
      <RotateKeyWizard
        open={dialog === 'rotate'}
        sshKey={selected}
        replacements={list.items}
        onClose={() => setDialog(null)}
        onDone={() => {
          setToast(copy.toastRotated);
          void list.refresh();
        }}
      />
      <DeleteSshKeyDialog
        open={dialog === 'delete'}
        sshKey={selected}
        onClose={() => setDialog(null)}
        onDeleted={() => {
          setToast(copy.toastDeleted);
          void list.refresh();
        }}
        onReplace={() => setDialog('rotate')}
      />
      <Toast message={toast} />
    </ServerSectionLayout>
  );
}

function SummaryStat({ label, value }: { label: string; value: number }) {
  return (
    <div className={styles.summaryItem}>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function Filters({
  query,
  onChange,
}: {
  query: SshKeysQueryState;
  onChange: (patch: Partial<SshKeysQueryState>) => void;
}) {
  const { messages } = useI18n();
  const copy = messages.servers.sshKeys;
  return (
    <>
      <select
        className={styles.filterSelect}
        aria-label={copy.type}
        value={query.type}
        onChange={(event) => onChange({ type: event.target.value as SshKeysQueryState['type'] })}
      >
        <option value="">{copy.allTypes}</option>
        <option value="private_key">{copy.types.private_key}</option>
        <option value="public_key">{copy.types.public_key}</option>
        <option value="generated_keypair">{copy.types.generated_keypair}</option>
      </select>
      <select
        className={styles.filterSelect}
        aria-label={copy.algorithm}
        value={query.algorithm}
        onChange={(event) =>
          onChange({ algorithm: event.target.value as SshKeysQueryState['algorithm'] })
        }
      >
        <option value="">{copy.allAlgorithms}</option>
        <option value="ed25519">{copy.algorithms.ed25519}</option>
        <option value="rsa">{copy.algorithms.rsa}</option>
        <option value="ecdsa">{copy.algorithms.ecdsa}</option>
      </select>
      <select
        className={styles.filterSelect}
        aria-label={copy.status}
        value={query.status}
        onChange={(event) =>
          onChange({ status: event.target.value as SshKeysQueryState['status'] })
        }
      >
        <option value="">{copy.allStatuses}</option>
        {Object.entries(copy.statuses).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      <select
        className={styles.filterSelect}
        aria-label={copy.usage}
        value={query.usage}
        onChange={(event) => onChange({ usage: event.target.value as SshKeysQueryState['usage'] })}
      >
        <option value="all">{copy.allUsage}</option>
        <option value="used">{copy.used}</option>
        <option value="unused">{copy.unused}</option>
      </select>
      <select
        className={styles.filterSelect}
        aria-label={copy.sort}
        value={query.sort}
        onChange={(event) => onChange({ sort: event.target.value as SshKeysQueryState['sort'] })}
      >
        <option value="name">{copy.sortName}</option>
        <option value="createdAt">{copy.sortCreated}</option>
        <option value="lastUsedAt">{copy.sortLastUsed}</option>
        <option value="serverCount">{copy.sortServers}</option>
        <option value="rotatedAt">{copy.sortRotated}</option>
      </select>
    </>
  );
}
