import {
  MAX_BULK_SERVERS,
  MAX_SERVER_TAGS,
  SERVER_TAG_PATTERN,
} from '@linuxpilot/server-contracts';

export const IMPORT_MAX_FILE_BYTES = 5 * 1024 * 1024;
export const IMPORT_MAX_SERVERS = MAX_BULK_SERVERS;
export const IMPORT_MAX_YAML_DEPTH = 8;
export const IMPORT_ACCEPTED_EXTENSIONS = ['.yaml', '.yml', '.json'] as const;
export const IMPORT_ACCEPTED_MIME = new Set([
  '',
  'application/json',
  'application/yaml',
  'application/x-yaml',
  'text/yaml',
  'text/x-yaml',
  'text/plain',
  'application/octet-stream',
]);

export const IMPORT_ROOT_KEYS = new Set(['version', 'servers']);
export const IMPORT_SERVER_KEYS = new Set([
  'name',
  'host',
  'hostname',
  'primaryIp',
  'port',
  'username',
  'auth',
  'group',
  'environment',
  'space',
  'spaceId',
  'tags',
  'description',
  'osName',
  'osVersion',
  'architecture',
  'autoDetectSystem',
]);
export const IMPORT_AUTH_KEYS = new Set(['type', 'credentialId']);
export const IMPORT_SECRET_KEYS = new Set([
  'password',
  'privateKey',
  'private_key',
  'secret',
  'passphrase',
  'token',
  'key',
]);

export const IMPORT_TAG_PATTERN = SERVER_TAG_PATTERN;
export const IMPORT_MAX_TAGS = MAX_SERVER_TAGS;

export const EXAMPLE_IMPORT_DOCUMENT = {
  version: 1,
  servers: [
    {
      name: 'web-production-01',
      host: '192.0.2.10',
      port: 22,
      username: 'linuxpilot',
      auth: {
        type: 'ssh_key',
        credentialId: 'existing-credential-id',
      },
      space: 'production-web',
      tags: ['web', 'nginx'],
    },
  ],
} as const;
