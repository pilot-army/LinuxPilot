export type ImportSource = 'file' | 'paste';
export type ImportFormat = 'yaml' | 'json';
export type DuplicateAction = 'skip' | 'update' | 'create';
export type PreviewStatus = 'ready' | 'warning' | 'error' | 'duplicate';
export type ImportRowResult = 'created' | 'updated' | 'skipped' | 'failed';

export type ParsedServerDraft = {
  key: string;
  name: string;
  host: string;
  hostname: string;
  primaryIp: string;
  port: number | null;
  username: string;
  authType: string;
  credentialId: string;
  groupName: string;
  tags: string[];
  description: string;
  secretsStripped: boolean;
  unknownFields: string[];
  spaceWarning?: 'deprecatedGroup' | 'deprecatedEnvironment' | 'groupSpaceConflict';
  spaceConflict?: boolean;
};

export type ParseIssue = {
  code:
    | 'unsupportedFormat'
    | 'tooLarge'
    | 'empty'
    | 'yamlParse'
    | 'jsonParse'
    | 'noServers'
    | 'unknownFields'
    | 'tooMany'
    | 'unsafeYaml'
    | 'tooDeep'
    | 'missingHost'
    | 'nameRequired'
    | 'previewLoadError';
  message?: string;
  line?: number;
  column?: number;
};

export type ParseResult = {
  ok: boolean;
  format: ImportFormat | null;
  servers: ParsedServerDraft[];
  issues: ParseIssue[];
  warnings: Array<
    | 'secrets'
    | 'authSkipped'
    | 'portSkipped'
    | 'usernameSkipped'
    | 'deprecatedGroup'
    | 'deprecatedEnvironment'
    | 'groupSpaceConflict'
  >;
};

export type PreviewRow = ParsedServerDraft & {
  selected: boolean;
  status: PreviewStatus;
  duplicateId: string | null;
  duplicateAction: DuplicateAction;
  groupId: string | null;
  notes: string[];
};

export type ImportOutcome = {
  key: string;
  name: string;
  result: ImportRowResult;
  error?: string;
};
