import type { ServerGroup, ServerSummary } from '@linuxpilot/server-contracts';
import {
  IMPORT_ACCEPTED_EXTENSIONS,
  IMPORT_ACCEPTED_MIME,
  IMPORT_MAX_FILE_BYTES,
  IMPORT_MAX_TAGS,
  IMPORT_TAG_PATTERN,
} from './constants';
import { extensionOf } from './example';
import { parseConfiguration } from './parse';
import type { DuplicateAction, ImportFormat, ParseIssue, ParseResult, PreviewRow } from './types';

export function inspectFile(file: File): ParseIssue | null {
  const ext = extensionOf(file.name);
  if (!IMPORT_ACCEPTED_EXTENSIONS.includes(ext as (typeof IMPORT_ACCEPTED_EXTENSIONS)[number])) {
    return { code: 'unsupportedFormat' };
  }
  if (!IMPORT_ACCEPTED_MIME.has(file.type)) {
    return { code: 'unsupportedFormat' };
  }
  if (file.size > IMPORT_MAX_FILE_BYTES) {
    return { code: 'tooLarge' };
  }
  if (file.size === 0) {
    return { code: 'empty' };
  }
  return null;
}

export function formatFromName(name: string): ImportFormat {
  return extensionOf(name) === '.json' ? 'json' : 'yaml';
}

export async function readAndParseFile(file: File): Promise<ParseResult> {
  const issue = inspectFile(file);
  if (issue) {
    return { ok: false, format: null, servers: [], issues: [issue], warnings: [] };
  }
  const text =
    typeof file.text === 'function' ? await file.text() : await new Response(file).text();
  return parseConfiguration(text, formatFromName(file.name));
}

export function buildPreviewRows(
  parsed: ParseResult,
  existing: ServerSummary[],
  groups: ServerGroup[],
): PreviewRow[] {
  return parsed.servers.map((server) => {
    const notes: string[] = [];
    if (server.secretsStripped) {
      notes.push('secrets');
    }
    if (server.username || server.authType || server.credentialId || server.port !== null) {
      notes.push('connectionSkipped');
    }
    const group = resolveImportedSpace(server.groupName, groups);
    if (server.groupName && !group) {
      notes.push('missingGroup');
    }
    if (server.spaceWarning === 'deprecatedGroup') {
      notes.push('deprecatedGroup');
    }
    if (server.spaceWarning === 'deprecatedEnvironment') {
      notes.push('deprecatedEnvironment');
    }
    if (server.spaceWarning === 'groupSpaceConflict' || server.spaceConflict) {
      notes.push('groupSpaceConflict');
    }
    const duplicate = existing.find(
      (item) =>
        item.name.toLowerCase() === server.name.toLowerCase() ||
        (server.hostname && item.hostname?.toLowerCase() === server.hostname.toLowerCase()) ||
        (server.primaryIp && item.primaryIp === server.primaryIp) ||
        (server.host && (item.primaryIp === server.host || item.hostname === server.host)),
    );
    const status = !server.name.trim()
      ? 'error'
      : duplicate
        ? 'duplicate'
        : notes.length > 0
          ? 'warning'
          : 'ready';
    const duplicateAction: DuplicateAction = duplicate ? 'skip' : 'create';
    return {
      ...server,
      selected: status !== 'error',
      status,
      duplicateId: duplicate?.id ?? null,
      duplicateAction,
      groupId: group?.id ?? null,
      notes,
    };
  });
}

export function patchPreviewRow(
  rows: PreviewRow[],
  key: string,
  update: Partial<PreviewRow>,
  groups: ServerGroup[],
): PreviewRow[] {
  return rows.map((row) => {
    if (row.key !== key) {
      return row;
    }
    const next: PreviewRow = { ...row, ...update };
    if (update.groupName !== undefined) {
      const group = resolveImportedSpace(next.groupName, groups);
      next.groupId = group?.id ?? null;
      next.notes = next.notes.filter((note) => note !== 'missingGroup');
      if (next.groupName.trim() && !group) {
        next.notes = [...next.notes, 'missingGroup'];
      }
    }
    if (update.tags !== undefined) {
      next.tags = next.tags
        .map((tag) => tag.trim())
        .filter((tag) => IMPORT_TAG_PATTERN.test(tag))
        .slice(0, IMPORT_MAX_TAGS);
    }
    const hasWarning = next.notes.length > 0;
    if (!next.name.trim()) {
      next.status = 'error';
      next.selected = false;
    } else if (next.duplicateId) {
      next.status = 'duplicate';
    } else {
      next.status = hasWarning ? 'warning' : 'ready';
    }
    if (next.status === 'error') {
      next.selected = false;
    }
    return next;
  });
}

function resolveImportedSpace(value: string, groups: ServerGroup[]) {
  const needle = value.trim().toLowerCase();
  if (!needle) {
    return undefined;
  }
  return groups.find(
    (item) =>
      item.id.toLowerCase() === needle ||
      item.name.toLowerCase() === needle ||
      item.slug?.toLowerCase() === needle,
  );
}
