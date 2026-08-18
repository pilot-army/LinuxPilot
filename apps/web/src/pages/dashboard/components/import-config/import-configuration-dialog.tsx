import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PERMISSIONS } from '@linuxpilot/auth-contracts';
import type { ServerGroup } from '@linuxpilot/server-contracts';
import {
  AlertTriangle,
  Check,
  ChevronDown,
  Download,
  FileUp,
  Info,
  Lock,
  Upload,
  X,
} from 'lucide-react';
import { usePermission } from '../../../../auth/use-permission';
import { listServerGroups, listServers } from '../../../../api/servers';
import { interpolate } from '../../../../features/dashboard/format';
import { useBodyScrollLock } from '../../../../features/dashboard/use-body-scroll-lock';
import { useFocusTrap } from '../../../../features/dashboard/use-focus-trap';
import { exampleJson, exampleYaml, formatBytes } from '../../../../features/import-config/example';
import { parseConfiguration } from '../../../../features/import-config/parse';
import {
  importReportCsv,
  importSelectedServers,
} from '../../../../features/import-config/run-import';
import type {
  DuplicateAction,
  ImportFormat,
  ImportOutcome,
  ImportSource,
  ParseIssue,
  ParseResult,
  PreviewRow,
} from '../../../../features/import-config/types';
import {
  buildPreviewRows,
  inspectFile,
  patchPreviewRow,
  readAndParseFile,
} from '../../../../features/import-config/validate';
import { useI18n } from '../../../../i18n';
import { Button } from '../../../../shared/ui/button';
import { UnsavedChangesDialog } from '../enrollment/unsaved-changes-dialog';
import styles from './import-configuration-dialog.module.css';

type ImportPhase =
  | 'idle'
  | 'dragging'
  | 'file_selected'
  | 'parsing'
  | 'local_validation_error'
  | 'ready_for_server_validation'
  | 'server_validating'
  | 'preview_ready'
  | 'importing'
  | 'success'
  | 'partial_success'
  | 'error';

type ImportConfigurationDialogProps = {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
};

export function ImportConfigurationDialog({
  open,
  onClose,
  onImported,
}: ImportConfigurationDialogProps) {
  const { messages } = useI18n();
  const copy = messages.dashboard.importConfig;
  const canCreate = usePermission(PERMISSIONS.SERVERS_CREATE);
  const navigate = useNavigate();
  const titleId = useId();
  const inputId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const importingRef = useRef(false);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [phase, setPhase] = useState<ImportPhase>('idle');
  const [source, setSource] = useState<ImportSource>('file');
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [paste, setPaste] = useState('');
  const [parsed, setParsed] = useState<ParseResult | null>(null);
  const [issue, setIssue] = useState<ParseIssue | null>(null);
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [groups, setGroups] = useState<ServerGroup[]>([]);
  const [outcomes, setOutcomes] = useState<ImportOutcome[]>([]);
  const [confirmClose, setConfirmClose] = useState(false);
  const [exampleOpen, setExampleOpen] = useState(false);
  const [exampleFormat, setExampleFormat] = useState<ImportFormat>('yaml');
  const [copied, setCopied] = useState(false);

  const dirty = Boolean(file || paste.trim() || step > 1);
  const live = interpolate(copy.stageChanged, {
    step,
    label: step === 1 ? copy.stepUpload : step === 2 ? copy.stepReview : copy.resultTitle,
  });

  const reset = useCallback(() => {
    setStep(1);
    setPhase('idle');
    setSource('file');
    setDragging(false);
    setFile(null);
    setPaste('');
    setParsed(null);
    setIssue(null);
    setRows([]);
    setGroups([]);
    setOutcomes([]);
    setConfirmClose(false);
    setExampleOpen(false);
    setCopied(false);
    importingRef.current = false;
  }, []);

  const finishClose = useCallback(() => {
    reset();
    onClose();
  }, [onClose, reset]);

  const requestDismiss = useCallback(() => {
    if (importingRef.current) {
      return;
    }
    if (dirty) {
      setConfirmClose(true);
      return;
    }
    finishClose();
  }, [dirty, finishClose]);

  useFocusTrap(open, panelRef, titleRef);
  useBodyScrollLock(open);

  useLayoutEffect(() => {
    if (!open) {
      return;
    }
    previousFocus.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    return () => {
      previousFocus.current?.focus({ preventScroll: true });
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') {
        return;
      }
      event.preventDefault();
      if (confirmClose) {
        setConfirmClose(false);
        return;
      }
      requestDismiss();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [confirmClose, open, requestDismiss]);

  function applyParsed(result: ParseResult, nextFile: File | null) {
    setFile(nextFile);
    setParsed(result);
    const nextIssue = result.issues[0] ?? null;
    setIssue(nextIssue);
    setPhase(
      result.ok
        ? 'ready_for_server_validation'
        : nextIssue
          ? 'local_validation_error'
          : nextFile
            ? 'file_selected'
            : 'idle',
    );
  }

  async function onFile(next: File | null) {
    if (!next) {
      setFile(null);
      setParsed(null);
      setIssue(null);
      setPhase('idle');
      return;
    }
    const local = inspectFile(next);
    if (local) {
      setFile(next);
      setParsed(null);
      setIssue(local);
      setPhase('local_validation_error');
      return;
    }
    setPhase('parsing');
    const result = await readAndParseFile(next);
    applyParsed(result, next);
  }

  function onPaste(value: string) {
    setPaste(value);
    if (!value.trim()) {
      setParsed(null);
      setIssue(null);
      setPhase('idle');
      return;
    }
    applyParsed(parseConfiguration(value, 'auto'), file);
  }

  async function goReview() {
    if (!parsed?.ok || phase === 'server_validating') {
      return;
    }
    setPhase('server_validating');
    setIssue((current) => (current?.code === 'previewLoadError' ? null : current));
    try {
      const [servers, groupList] = await Promise.all([
        listServers(new URLSearchParams({ page: '1', pageSize: '100' })),
        listServerGroups(),
      ]);
      setGroups(groupList.items);
      setRows(buildPreviewRows(parsed, servers.items, groupList.items));
      setStep(2);
      setPhase('preview_ready');
    } catch {
      setIssue({ code: 'previewLoadError' });
      setPhase(parsed.ok ? 'ready_for_server_validation' : 'error');
    }
  }

  async function runImport() {
    if (importingRef.current || !canCreate) {
      return;
    }
    importingRef.current = true;
    setPhase('importing');
    const selected = rows.filter((row) => row.selected);
    const result = await importSelectedServers(selected);
    setOutcomes(result);
    importingRef.current = false;
    setStep(3);
    const createdOrUpdated = result.some(
      (item) => item.result === 'created' || item.result === 'updated',
    );
    const failed = result.some((item) => item.result === 'failed');
    setPhase(failed && createdOrUpdated ? 'partial_success' : failed ? 'error' : 'success');
    if (createdOrUpdated) {
      onImported();
    }
  }

  function errorText(item: ParseIssue | null): string {
    if (!item) {
      return '';
    }
    const base =
      item.code in copy.errors
        ? copy.errors[item.code as keyof typeof copy.errors]
        : copy.errors.failed;
    if (item.line && item.column) {
      return `${base}. ${interpolate(copy.errors.at, { line: item.line, column: item.column })}`;
    }
    return item.message ? `${base}: ${item.message}` : base;
  }

  if (!open) {
    return null;
  }

  const selectedCount = rows.filter((row) => row.selected && row.status !== 'error').length;
  const selectedErrors = rows.some((row) => row.selected && row.status === 'error');
  const errorCount = rows.filter((row) => row.status === 'error').length;
  const canContinue =
    Boolean(parsed?.ok) &&
    phase === 'ready_for_server_validation' &&
    (!issue || issue.code === 'previewLoadError');
  const canImport =
    canCreate &&
    selectedCount > 0 &&
    !selectedErrors &&
    phase === 'preview_ready' &&
    !importingRef.current;

  return (
    <div className={styles.overlayRoot} data-testid="import-config-dialog" data-phase={phase}>
      <button
        type="button"
        className={styles.backdrop}
        aria-label={copy.close}
        data-testid="import-overlay"
        onClick={requestDismiss}
      />
      <div
        ref={panelRef}
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <header className={styles.header}>
          <span className={styles.headerIcon} aria-hidden="true">
            <FileUp size={18} strokeWidth={2} />
          </span>
          <div className={styles.headerCopy}>
            <h2 id={titleId} ref={titleRef} tabIndex={-1}>
              {copy.title}
            </h2>
            <p>{copy.subtitle}</p>
          </div>
          <button
            type="button"
            className={styles.close}
            aria-label={copy.close}
            data-testid="import-close"
            onClick={requestDismiss}
          >
            <X size={18} strokeWidth={2} />
          </button>
        </header>

        <div className={styles.steps} aria-hidden="true">
          <span className={`${styles.step} ${step === 1 ? styles.stepActive : ''}`}>
            <span className={styles.stepIndex}>1</span>
            {copy.stepUpload}
          </span>
          <span className={styles.stepLine} />
          <span className={`${styles.step} ${step !== 1 ? styles.stepActive : ''}`}>
            <span className={styles.stepIndex}>2</span>
            {copy.stepReview}
          </span>
        </div>
        <div className="sr-only" aria-live="polite">
          {live}
          {errorText(issue)}
        </div>

        <div className={styles.body}>
          {step === 1 && phase !== 'server_validating' ? (
            <UploadStep
              source={source}
              dragging={dragging}
              file={file}
              paste={paste}
              parsed={parsed}
              issueText={errorText(issue)}
              exampleOpen={exampleOpen}
              exampleFormat={exampleFormat}
              copied={copied}
              inputId={inputId}
              onSource={setSource}
              onDrag={setDragging}
              onFile={(next) => void onFile(next)}
              onPaste={onPaste}
              onExampleOpen={setExampleOpen}
              onExampleFormat={setExampleFormat}
              onCopied={setCopied}
            />
          ) : null}
          {step === 2 && phase !== 'importing' ? (
            <ReviewStep rows={rows} groups={groups} onRows={setRows} />
          ) : null}
          {phase === 'server_validating' || phase === 'importing' ? (
            <div className={styles.progress} role="status">
              {phase === 'importing' ? copy.importing : copy.validating}
            </div>
          ) : null}
          {step === 3 ? (
            <ResultStep
              outcomes={outcomes}
              onOpenServers={() => {
                finishClose();
                navigate('/servers');
              }}
              onClose={finishClose}
            />
          ) : null}
        </div>

        {step === 3 ? null : (
          <footer className={styles.footer}>
            <div className={styles.footerMeta}>
              <span>
                {step === 1
                  ? source === 'file'
                    ? file
                      ? interpolate(copy.footerFile, { name: file.name })
                      : copy.footerNone
                    : paste.trim()
                      ? copy.footerPasted
                      : copy.footerNone
                  : `${interpolate(copy.selectedCount, { count: selectedCount })} · ${interpolate(copy.errorCount, { count: errorCount })}`}
              </span>
              <span className={styles.secure}>
                <Lock size={12} strokeWidth={2} aria-hidden="true" />
                {copy.protected}
              </span>
            </div>
            <div className={styles.footerActions}>
              {step === 2 ? (
                <Button
                  variant="secondary"
                  block={false}
                  data-testid="import-back"
                  onClick={() => {
                    setStep(1);
                    setPhase(parsed?.ok ? 'ready_for_server_validation' : 'idle');
                  }}
                >
                  {copy.back}
                </Button>
              ) : null}
              <Button
                variant="secondary"
                block={false}
                data-testid="import-cancel"
                onClick={requestDismiss}
              >
                {copy.cancel}
              </Button>
              {step === 1 ? (
                <Button
                  block={false}
                  disabled={!canContinue}
                  data-testid="import-continue"
                  onClick={() => void goReview()}
                >
                  {copy.continue}
                </Button>
              ) : (
                <Button
                  block={false}
                  disabled={!canImport}
                  data-testid="import-submit"
                  onClick={() => void runImport()}
                >
                  {interpolate(copy.importAction, { count: selectedCount })}
                </Button>
              )}
            </div>
          </footer>
        )}
      </div>
      <UnsavedChangesDialog
        open={confirmClose}
        title={copy.unsavedTitle}
        body={copy.unsavedBody}
        confirmLabel={copy.unsavedConfirm}
        dialogTestId="import-unsaved"
        confirmTestId="import-unsaved-confirm"
        onContinue={() => setConfirmClose(false)}
        onConfirm={finishClose}
      />
    </div>
  );
}

function UploadStep(props: {
  source: ImportSource;
  dragging: boolean;
  file: File | null;
  paste: string;
  parsed: ParseResult | null;
  issueText: string;
  exampleOpen: boolean;
  exampleFormat: ImportFormat;
  copied: boolean;
  inputId: string;
  onSource: (value: ImportSource) => void;
  onDrag: (value: boolean) => void;
  onFile: (file: File | null) => void;
  onPaste: (value: string) => void;
  onExampleOpen: (value: boolean) => void;
  onExampleFormat: (value: ImportFormat) => void;
  onCopied: (value: boolean) => void;
}) {
  const { messages } = useI18n();
  const copy = messages.dashboard.importConfig;
  const sample = props.exampleFormat === 'json' ? exampleJson() : exampleYaml();

  return (
    <>
      <div className={styles.tabs} role="tablist">
        <button
          type="button"
          role="tab"
          className={styles.tab}
          aria-selected={props.source === 'file'}
          data-testid="import-tab-file"
          onClick={() => props.onSource('file')}
        >
          {copy.tabFile}
        </button>
        <button
          type="button"
          role="tab"
          className={styles.tab}
          aria-selected={props.source === 'paste'}
          data-testid="import-tab-paste"
          onClick={() => props.onSource('paste')}
        >
          {copy.tabPaste}
        </button>
      </div>

      {props.source === 'file' ? (
        props.file && props.parsed?.ok ? (
          <div className={styles.fileCard} data-testid="import-file-summary">
            <p className={styles.valid}>
              <Check size={14} strokeWidth={2} aria-hidden="true" /> {copy.fileValid}
            </p>
            <div className={styles.fileMeta}>
              <div>
                <strong>{copy.fileName}</strong>
                {props.file.name}
              </div>
              <div>
                <strong>{copy.fileSize}</strong>
                {formatBytes(props.file.size)}
              </div>
              <div>
                <strong>{copy.fileFormat}</strong>
                {props.parsed.format?.toUpperCase()}
              </div>
              <div>
                <strong>{copy.fileCount}</strong>
                {props.parsed.servers.length}
              </div>
            </div>
            <div className={styles.fileActions}>
              <label htmlFor={props.inputId} className={styles.chooseFile}>
                {copy.replaceFile}
              </label>
              <Button variant="ghost" block={false} onClick={() => props.onFile(null)}>
                {copy.removeFile}
              </Button>
            </div>
          </div>
        ) : (
          <div
            className={`${styles.dropzone} ${props.dragging ? styles.dropzoneDragging : ''}`}
            data-testid="import-dropzone"
            onDragEnter={(event) => {
              event.preventDefault();
              props.onDrag(true);
            }}
            onDragOver={(event) => event.preventDefault()}
            onDragLeave={() => props.onDrag(false)}
            onDrop={(event) => {
              event.preventDefault();
              props.onDrag(false);
              const next = event.dataTransfer.files[0];
              if (next) {
                props.onFile(next);
              }
            }}
          >
            <Upload size={28} strokeWidth={2} aria-hidden="true" />
            <strong>{copy.dropTitle}</strong>
            <span className={styles.dropOr}>{copy.dropOr}</span>
            <label htmlFor={props.inputId} className={styles.chooseFile}>
              <Upload size={16} strokeWidth={2} aria-hidden="true" />
              {copy.chooseFile}
            </label>
            <p className={styles.dropHint}>{copy.dropHint}</p>
          </div>
        )
      ) : (
        <div className={styles.editor}>
          <textarea
            value={props.paste}
            onChange={(event) => props.onPaste(event.target.value)}
            placeholder={copy.pastePlaceholder}
            spellCheck={false}
            aria-label={copy.tabPaste}
            data-testid="import-paste"
          />
          <div className={styles.editorActions}>
            <Button
              variant="secondary"
              block={false}
              onClick={() => {
                try {
                  if (props.paste.trim().startsWith('{')) {
                    props.onPaste(`${JSON.stringify(JSON.parse(props.paste), null, 2)}\n`);
                  }
                } catch {
                  /* keep text */
                }
              }}
            >
              {copy.formatAction}
            </Button>
            <Button variant="ghost" block={false} onClick={() => props.onPaste('')}>
              {copy.clearAction}
            </Button>
          </div>
        </div>
      )}

      <input
        id={props.inputId}
        className={styles.hiddenInput}
        type="file"
        accept=".yaml,.yml,.json,application/json,text/yaml,text/plain"
        aria-label={copy.fileInput}
        data-testid="import-file-input"
        onChange={(event) => {
          props.onFile(event.target.files?.[0] ?? null);
          event.target.value = '';
        }}
      />
      {props.issueText ? (
        <p className={styles.error} role="alert" data-testid="import-error">
          {props.issueText}
        </p>
      ) : null}

      <section className={styles.infoCard}>
        <h3 className={styles.infoTitle}>
          <Info size={14} strokeWidth={2} aria-hidden="true" />
          {copy.whatTitle}
        </h3>
        <ul>
          <li>{copy.whatName}</li>
          <li>{copy.whatHost}</li>
          <li>{copy.whatPort}</li>
          <li>{copy.whatAuth}</li>
          <li>{copy.whatGroup}</li>
          <li>{copy.whatTags}</li>
        </ul>
        <p className={styles.warning}>
          <AlertTriangle size={14} strokeWidth={2} aria-hidden="true" />
          {copy.secretWarning}
        </p>
      </section>

      <section className={styles.example}>
        <button
          type="button"
          className={styles.exampleHead}
          aria-expanded={props.exampleOpen}
          data-testid="import-example-toggle"
          onClick={() => props.onExampleOpen(!props.exampleOpen)}
        >
          <span>
            <Download size={14} strokeWidth={2} aria-hidden="true" />
            {copy.exampleTitle}
          </span>
          <ChevronDown size={16} strokeWidth={2} aria-hidden="true" />
        </button>
        {props.exampleOpen ? (
          <>
            <div className={styles.exampleTabs}>
              <div className={styles.exampleTabGroup} role="tablist" aria-label={copy.exampleTitle}>
                <Button
                  className={styles.exampleButton}
                  variant={props.exampleFormat === 'yaml' ? 'primary' : 'secondary'}
                  block={false}
                  aria-selected={props.exampleFormat === 'yaml'}
                  onClick={() => props.onExampleFormat('yaml')}
                >
                  {copy.exampleYaml}
                </Button>
                <Button
                  className={styles.exampleButton}
                  variant={props.exampleFormat === 'json' ? 'primary' : 'secondary'}
                  block={false}
                  aria-selected={props.exampleFormat === 'json'}
                  onClick={() => props.onExampleFormat('json')}
                >
                  {copy.exampleJson}
                </Button>
              </div>
              <div className={styles.exampleActions}>
                <Button
                  className={styles.exampleButton}
                  variant="secondary"
                  block={false}
                  data-testid="import-example-copy"
                  onClick={async () => {
                    await navigator.clipboard.writeText(sample);
                    props.onCopied(true);
                  }}
                >
                  {props.copied ? copy.copied : copy.copyExample}
                </Button>
                <Button
                  className={styles.exampleButton}
                  variant="secondary"
                  block={false}
                  data-testid="import-example-download"
                  onClick={() => {
                    const blob = new Blob([sample], {
                      type: props.exampleFormat === 'json' ? 'application/json' : 'text/yaml',
                    });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `linuxpilot-servers.${props.exampleFormat === 'json' ? 'json' : 'yaml'}`;
                    link.click();
                    URL.revokeObjectURL(url);
                  }}
                >
                  {copy.downloadExample}
                </Button>
              </div>
            </div>
            <pre data-testid="import-example">{sample}</pre>
          </>
        ) : null}
      </section>
    </>
  );
}

function ReviewStep({
  rows,
  groups,
  onRows,
}: {
  rows: PreviewRow[];
  groups: ServerGroup[];
  onRows: (rows: PreviewRow[]) => void;
}) {
  const { messages } = useI18n();
  const copy = messages.dashboard.importConfig;
  const found = rows.length;
  const ready = rows.filter((row) => row.status === 'ready').length;
  const warnings = rows.filter((row) => row.status === 'warning').length;
  const errors = rows.filter((row) => row.status === 'error').length;
  const duplicates = rows.filter((row) => row.status === 'duplicate').length;

  function patch(key: string, update: Partial<PreviewRow>) {
    onRows(patchPreviewRow(rows, key, update, groups));
  }

  return (
    <>
      <div className={styles.summary} data-testid="import-summary">
        <span>
          {copy.summaryFound}
          <strong>{found}</strong>
        </span>
        <span>
          {copy.summaryReady}
          <strong>{ready}</strong>
        </span>
        <span>
          {copy.summaryWarnings}
          <strong>{warnings}</strong>
        </span>
        <span>
          {copy.summaryErrors}
          <strong>{errors}</strong>
        </span>
        <span>
          {copy.summaryDuplicates}
          <strong>{duplicates}</strong>
        </span>
      </div>
      <div className={styles.tableWrap}>
        <table className={styles.table} data-testid="import-preview-table">
          <thead>
            <tr>
              <th>{copy.colSelect}</th>
              <th>{copy.colName}</th>
              <th>{copy.colHost}</th>
              <th className={styles.desktopOnly}>{copy.colPort}</th>
              <th className={styles.desktopOnly}>{copy.colUser}</th>
              <th className={styles.desktopOnly}>{copy.colAuth}</th>
              <th className={styles.desktopOnly}>{copy.colGroup}</th>
              <th className={styles.desktopOnly}>{copy.colTags}</th>
              <th>{copy.colStatus}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <PreviewFields key={row.key} row={row} onPatch={patch} variant="row" />
            ))}
          </tbody>
        </table>
      </div>
      <div className={styles.cards} data-testid="import-preview-cards">
        {rows.map((row) => (
          <PreviewFields key={row.key} row={row} onPatch={patch} variant="card" />
        ))}
      </div>
    </>
  );
}

function PreviewFields({
  row,
  onPatch,
  variant,
}: {
  row: PreviewRow;
  onPatch: (key: string, update: Partial<PreviewRow>) => void;
  variant: 'row' | 'card';
}) {
  const { messages } = useI18n();
  const copy = messages.dashboard.importConfig;
  const notes = row.notes.map((note) =>
    note === 'secrets'
      ? copy.noteSecrets
      : note === 'connectionSkipped'
        ? copy.noteConnection
        : note === 'deprecatedGroup'
          ? copy.noteDeprecatedGroup
          : note === 'deprecatedEnvironment'
            ? copy.noteDeprecatedEnvironment
            : note === 'groupSpaceConflict'
              ? copy.noteGroupSpaceConflict
              : copy.noteMissingGroup,
  );
  const checkbox = (
    <input
      type="checkbox"
      checked={row.selected}
      disabled={row.status === 'error'}
      aria-label={row.name}
      onChange={(event) => onPatch(row.key, { selected: event.target.checked })}
    />
  );
  const nameField = (
    <input
      type="text"
      value={row.name}
      aria-label={copy.colName}
      onChange={(event) => onPatch(row.key, { name: event.target.value.slice(0, 80) })}
    />
  );
  const host = row.primaryIp || row.hostname || row.host;
  const portField = (
    <input
      type="number"
      value={row.port ?? ''}
      aria-label={copy.colPort}
      onChange={(event) =>
        onPatch(row.key, { port: event.target.value ? Number(event.target.value) : null })
      }
    />
  );
  const userField = (
    <input
      type="text"
      value={row.username}
      aria-label={copy.colUser}
      onChange={(event) => onPatch(row.key, { username: event.target.value })}
    />
  );
  const groupField = (
    <input
      type="text"
      value={row.groupName}
      aria-label={copy.colGroup}
      onChange={(event) => onPatch(row.key, { groupName: event.target.value })}
    />
  );
  const tagsField = (
    <input
      type="text"
      value={row.tags.join(', ')}
      aria-label={copy.colTags}
      onChange={(event) =>
        onPatch(row.key, {
          tags: event.target.value
            .split(',')
            .map((tag) => tag.trim())
            .filter(Boolean),
        })
      }
    />
  );
  const authLabel = row.authType || '—';
  const statusBlock = (
    <div>
      <StatusBadge status={row.status} />
      {row.status === 'duplicate' ? (
        <select
          value={row.duplicateAction}
          aria-label={copy.statusDuplicate}
          onChange={(event) =>
            onPatch(row.key, { duplicateAction: event.target.value as DuplicateAction })
          }
        >
          <option value="skip">{copy.dupSkip}</option>
          <option value="update">{copy.dupUpdate}</option>
          <option value="create">{copy.dupCreate}</option>
        </select>
      ) : null}
      {notes.length > 0 ? (
        <div className={styles.notes}>
          {notes.map((note) => (
            <span key={note}>{note}</span>
          ))}
        </div>
      ) : null}
    </div>
  );

  if (variant === 'card') {
    return (
      <article className={styles.card}>
        <div className={styles.cardHead}>
          {checkbox}
          <StatusBadge status={row.status} />
        </div>
        {nameField}
        <span>{host}</span>
        {portField}
        {userField}
        <span>{authLabel}</span>
        {groupField}
        {tagsField}
        {statusBlock}
      </article>
    );
  }

  return (
    <tr data-testid={`import-row-${row.key}`}>
      <td>{checkbox}</td>
      <td>{nameField}</td>
      <td>{host}</td>
      <td className={styles.desktopOnly}>{portField}</td>
      <td className={styles.desktopOnly}>{userField}</td>
      <td className={styles.desktopOnly}>{authLabel}</td>
      <td className={styles.desktopOnly}>{groupField}</td>
      <td className={styles.desktopOnly}>{tagsField}</td>
      <td>{statusBlock}</td>
    </tr>
  );
}

function StatusBadge({ status }: { status: PreviewRow['status'] }) {
  const { messages } = useI18n();
  const copy = messages.dashboard.importConfig;
  const className =
    status === 'ready'
      ? styles.ready
      : status === 'warning'
        ? styles.warningBadge
        : status === 'error'
          ? styles.errorBadge
          : styles.dupBadge;
  const label =
    status === 'ready'
      ? copy.statusReady
      : status === 'warning'
        ? copy.statusWarning
        : status === 'error'
          ? copy.statusError
          : copy.statusDuplicate;
  return <span className={`${styles.badge} ${className}`}>{label}</span>;
}

function ResultStep({
  outcomes,
  onOpenServers,
  onClose,
}: {
  outcomes: ImportOutcome[];
  onOpenServers: () => void;
  onClose: () => void;
}) {
  const { messages } = useI18n();
  const copy = messages.dashboard.importConfig;
  const created = outcomes.filter((item) => item.result === 'created').length;
  const updated = outcomes.filter((item) => item.result === 'updated').length;
  const skipped = outcomes.filter((item) => item.result === 'skipped').length;
  const failed = outcomes.filter((item) => item.result === 'failed').length;
  const labels = {
    created: copy.rowCreated,
    updated: copy.rowUpdated,
    skipped: copy.rowSkipped,
    failed: copy.rowFailed,
  } as const;

  return (
    <div data-testid="import-result">
      <h3>{copy.resultTitle}</h3>
      <div className={styles.summary}>
        <span>{interpolate(copy.resultCreated, { count: created })}</span>
        <span>{interpolate(copy.resultUpdated, { count: updated })}</span>
        <span>{interpolate(copy.resultSkipped, { count: skipped })}</span>
        <span>{interpolate(copy.resultFailed, { count: failed })}</span>
      </div>
      <ul className={styles.resultList}>
        {outcomes.map((item) => (
          <li key={item.key}>
            {item.name}: {labels[item.result]}
            {item.error
              ? ` (${copy.errors[item.error as keyof typeof copy.errors] ?? item.error})`
              : ''}
          </li>
        ))}
      </ul>
      <div className={styles.footerActions}>
        <Button block={false} data-testid="import-open-servers" onClick={onOpenServers}>
          {copy.openServers}
        </Button>
        <Button
          variant="secondary"
          block={false}
          onClick={() => {
            const blob = new Blob([importReportCsv(outcomes)], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'linuxpilot-import-report.csv';
            link.click();
            URL.revokeObjectURL(url);
          }}
        >
          {copy.downloadReport}
        </Button>
        <Button
          variant="secondary"
          block={false}
          data-testid="import-result-close"
          onClick={onClose}
        >
          {messages.common.actions.close}
        </Button>
      </div>
    </div>
  );
}
