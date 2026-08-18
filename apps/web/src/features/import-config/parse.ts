import { isAlias, isCollection, parseDocument, visit } from 'yaml';
import {
  IMPORT_AUTH_KEYS,
  IMPORT_MAX_SERVERS,
  IMPORT_MAX_TAGS,
  IMPORT_MAX_YAML_DEPTH,
  IMPORT_ROOT_KEYS,
  IMPORT_SECRET_KEYS,
  IMPORT_SERVER_KEYS,
  IMPORT_TAG_PATTERN,
} from './constants';
import { isIp, isUnsafeHost, looksLikeJson } from './example';
import type { ImportFormat, ParseIssue, ParseResult, ParsedServerDraft } from './types';

export function detectFormat(text: string, hint?: ImportFormat | 'auto'): ImportFormat {
  if (hint === 'json' || hint === 'yaml') {
    return hint;
  }
  return looksLikeJson(text) ? 'json' : 'yaml';
}

export function parseConfiguration(
  text: string,
  hint: ImportFormat | 'auto' = 'auto',
): ParseResult {
  const trimmed = text.trim();
  if (!trimmed) {
    return emptyResult([{ code: 'empty' }]);
  }

  const format = detectFormat(trimmed, hint);
  if (format === 'json') {
    return parseJson(trimmed);
  }
  return parseYaml(trimmed);
}

function emptyResult(issues: ParseIssue[], format: ImportFormat | null = null): ParseResult {
  return { ok: false, format, servers: [], issues, warnings: [] };
}

function parseJson(text: string): ParseResult {
  try {
    const value = JSON.parse(text) as unknown;
    return normalizeDocument(value, 'json');
  } catch (error) {
    const message = error instanceof Error ? error.message : undefined;
    return emptyResult([{ code: 'jsonParse', message }], 'json');
  }
}

function parseYaml(text: string): ParseResult {
  const document = parseDocument(text, {
    prettyErrors: true,
    uniqueKeys: true,
    schema: 'core',
    logLevel: 'silent',
  });

  if (document.errors.length > 0) {
    const first = document.errors[0]!;
    const line = first.linePos?.[0]?.line;
    const column = first.linePos?.[0]?.col;
    return emptyResult([{ code: 'yamlParse', message: first.message, line, column }], 'yaml');
  }

  let unsafe = false;
  visit(document, {
    Alias() {
      unsafe = true;
    },
    Node(_, node) {
      if (isAlias(node)) {
        unsafe = true;
        return;
      }
      const tag =
        isCollection(node) || (node && typeof node === 'object' && 'tag' in node)
          ? String((node as { tag?: string }).tag ?? '')
          : '';
      if (tag && !tag.startsWith('tag:yaml.org,2002:') && tag !== '!') {
        unsafe = true;
      }
    },
  });
  if (unsafe) {
    return emptyResult([{ code: 'unsafeYaml' }], 'yaml');
  }

  const value = document.toJS({ maxAliasCount: 0 }) as unknown;
  if (depthOf(value) > IMPORT_MAX_YAML_DEPTH) {
    return emptyResult([{ code: 'tooDeep' }], 'yaml');
  }
  return normalizeDocument(value, 'yaml');
}

function normalizeDocument(value: unknown, format: ImportFormat): ParseResult {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return emptyResult([{ code: 'noServers' }], format);
  }
  const root = value as Record<string, unknown>;
  const unknownRoot = Object.keys(root).filter((key) => !IMPORT_ROOT_KEYS.has(key));
  if (unknownRoot.length > 0) {
    return emptyResult([{ code: 'unknownFields', message: unknownRoot.join(', ') }], format);
  }
  if (root.version !== undefined && root.version !== 1) {
    return emptyResult([{ code: 'unknownFields', message: 'version' }], format);
  }
  if (!Array.isArray(root.servers)) {
    return emptyResult([{ code: 'noServers' }], format);
  }
  if (root.servers.length === 0) {
    return emptyResult([{ code: 'noServers' }], format);
  }
  if (root.servers.length > IMPORT_MAX_SERVERS) {
    return emptyResult([{ code: 'tooMany' }], format);
  }

  const servers: ParsedServerDraft[] = [];
  const warnings: ParseResult['warnings'] = [];
  const issues: ParseIssue[] = [];

  root.servers.forEach((item, index) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      issues.push({ code: 'unknownFields', message: `servers[${index}]` });
      return;
    }
    const row = item as Record<string, unknown>;
    const unknown = Object.keys(row).filter(
      (key) => !IMPORT_SERVER_KEYS.has(key) && !IMPORT_SECRET_KEYS.has(key),
    );
    const secrets =
      Object.keys(row).some((key) => IMPORT_SECRET_KEYS.has(key)) || hasSecretAuth(row.auth);
    if (unknown.length > 0) {
      issues.push({ code: 'unknownFields', message: unknown.join(', ') });
      return;
    }
    const name = asString(row.name);
    if (!name) {
      issues.push({ code: 'nameRequired', message: `servers[${index}].name` });
      return;
    }
    const host = asString(row.host);
    if (host && isUnsafeHost(host)) {
      issues.push({ code: 'unknownFields', message: `servers[${index}].host` });
      return;
    }
    const hostname = asString(row.hostname) || (host && !isIp(host) ? host : '');
    const primaryIp = asString(row.primaryIp) || (isIp(host) ? host : '');
    if (!host && !hostname && !primaryIp) {
      issues.push({ code: 'missingHost', message: `servers[${index}]` });
      return;
    }
    const port = asNumber(row.port);
    if (port !== null && (port < 1 || port > 65535 || !Number.isInteger(port))) {
      issues.push({ code: 'unknownFields', message: `servers[${index}].port` });
      return;
    }
    const username = asString(row.username);
    const auth =
      row.auth && typeof row.auth === 'object' && !Array.isArray(row.auth)
        ? (row.auth as Record<string, unknown>)
        : {};
    const authUnknown = Object.keys(auth).filter(
      (key) => !IMPORT_AUTH_KEYS.has(key) && !IMPORT_SECRET_KEYS.has(key),
    );
    if (authUnknown.length > 0) {
      issues.push({ code: 'unknownFields', message: authUnknown.join(', ') });
      return;
    }
    const tags = Array.isArray(row.tags)
      ? row.tags
          .map((tag) => String(tag).trim())
          .filter((tag) => IMPORT_TAG_PATTERN.test(tag))
          .slice(0, IMPORT_MAX_TAGS)
      : [];

    if (secrets) {
      warnings.push('secrets');
    }
    if (username) {
      warnings.push('usernameSkipped');
    }
    if (port !== null) {
      warnings.push('portSkipped');
    }
    if (asString(auth.type) || asString(auth.credentialId)) {
      warnings.push('authSkipped');
    }

    const spaceValue = row.space;
    const spaceFromObject =
      spaceValue && typeof spaceValue === 'object' && !Array.isArray(spaceValue)
        ? asString((spaceValue as { name?: unknown }).name)
        : '';
    const spaceName = asString(spaceValue) || spaceFromObject || asString(row.spaceId);
    const groupName = asString(row.group);
    const environmentName = asString(row.environment);
    const orgValues = [spaceName, groupName, environmentName]
      .map((value) => value.toLowerCase())
      .filter(Boolean);
    const uniqueOrg = [...new Set(orgValues)];
    let spaceWarning: ParsedServerDraft['spaceWarning'];
    let resolvedSpace = spaceName || groupName || environmentName;
    let spaceConflict = false;
    if (uniqueOrg.length > 1) {
      warnings.push('groupSpaceConflict');
      spaceWarning = 'groupSpaceConflict';
      resolvedSpace = '';
      spaceConflict = true;
    } else if (groupName && !spaceName && !environmentName) {
      warnings.push('deprecatedGroup');
      spaceWarning = 'deprecatedGroup';
    } else if (environmentName && !spaceName && !groupName) {
      warnings.push('deprecatedEnvironment');
      spaceWarning = 'deprecatedEnvironment';
    }

    servers.push({
      key: `${name}-${index}`,
      name: name.slice(0, 80),
      host,
      hostname: hostname.slice(0, 255),
      primaryIp,
      port,
      username,
      authType: asString(auth.type),
      credentialId: asString(auth.credentialId),
      groupName: resolvedSpace,
      spaceConflict,
      tags,
      description: asString(row.description).slice(0, 500),
      secretsStripped: secrets,
      unknownFields: unknown,
      spaceWarning,
    });
  });

  const uniqueWarnings = [...new Set(warnings)];
  if (issues.length > 0) {
    return { ok: false, format, servers: [], issues, warnings: uniqueWarnings };
  }
  return { ok: servers.length > 0, format, servers, issues, warnings: uniqueWarnings };
}

function hasSecretAuth(value: unknown): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  return Object.keys(value).some((key) => IMPORT_SECRET_KEYS.has(key));
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && /^\d+$/.test(value.trim())) {
    return Number(value.trim());
  }
  return null;
}

function depthOf(value: unknown, depth = 1): number {
  if (!value || typeof value !== 'object') {
    return depth;
  }
  const children = Array.isArray(value) ? value : Object.values(value);
  return children.reduce((max, child) => Math.max(max, depthOf(child, depth + 1)), depth);
}
