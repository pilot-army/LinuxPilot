import { describe, expect, it } from 'vitest';
import { EXAMPLE_IMPORT_DOCUMENT } from './constants';
import { exampleJson, exampleYaml } from './example';
import { parseConfiguration } from './parse';
import { inspectFile } from './validate';

const validYaml = `version: 1
servers:
  - name: web-production-01
    host: 192.0.2.10
    port: 22
    username: linuxpilot
    group: production
    tags:
      - web
`;

describe('parseConfiguration', () => {
  it('parses the centralized YAML example', () => {
    const result = parseConfiguration(exampleYaml(), 'yaml');
    expect(result.ok).toBe(true);
    expect(result.format).toBe('yaml');
    expect(result.servers).toHaveLength(1);
    expect(result.servers[0]?.name).toBe(EXAMPLE_IMPORT_DOCUMENT.servers[0].name);
    expect(result.servers[0]?.primaryIp).toBe('192.0.2.10');
    expect(JSON.stringify(result.servers[0])).not.toContain('password');
  });

  it('parses the centralized JSON example', () => {
    const result = parseConfiguration(exampleJson(), 'json');
    expect(result.ok).toBe(true);
    expect(result.format).toBe('json');
    expect(result.servers[0]?.host).toBe('192.0.2.10');
  });

  it('parses multiple servers', () => {
    const result = parseConfiguration(`version: 1
servers:
  - name: web-01
    host: 192.0.2.10
  - name: db-01
    host: db.example.test
`);
    expect(result.ok).toBe(true);
    expect(result.servers).toHaveLength(2);
    expect(result.servers[1]?.hostname).toBe('db.example.test');
  });

  it('rejects empty content', () => {
    expect(parseConfiguration('   ').issues[0]?.code).toBe('empty');
  });

  it('rejects invalid YAML with a line number', () => {
    const result = parseConfiguration('servers: [', 'yaml');
    expect(result.ok).toBe(false);
    expect(result.issues[0]?.code).toBe('yamlParse');
    expect(result.issues[0]?.line).toBeGreaterThan(0);
  });

  it('rejects invalid JSON', () => {
    const result = parseConfiguration('{', 'json');
    expect(result.ok).toBe(false);
    expect(result.issues[0]?.code).toBe('jsonParse');
  });

  it('rejects unknown fields', () => {
    const result = parseConfiguration(`version: 1
servers:
  - name: web-01
    host: 192.0.2.10
    exec: true
`);
    expect(result.ok).toBe(false);
    expect(result.issues[0]?.code).toBe('unknownFields');
    expect(result.issues[0]?.message).toContain('exec');
  });

  it('rejects documents without servers', () => {
    expect(parseConfiguration('version: 1\nservers: []\n').issues[0]?.code).toBe('noServers');
  });

  it('rejects a missing host', () => {
    const result = parseConfiguration(`version: 1
servers:
  - name: web-01
`);
    expect(result.issues[0]?.code).toBe('missingHost');
  });

  it('strips secrets and does not keep them on the draft', () => {
    const result = parseConfiguration(`version: 1
servers:
  - name: web-01
    host: 192.0.2.10
    password: hunter2
    auth:
      type: password
      privateKey: -----BEGIN
`);
    expect(result.ok).toBe(true);
    expect(result.warnings).toContain('secrets');
    expect(JSON.stringify(result.servers)).not.toContain('hunter2');
    expect(JSON.stringify(result.servers)).not.toContain('BEGIN');
  });

  it('rejects YAML aliases', () => {
    const result = parseConfiguration(`version: 1
servers:
  - name: web-01
    host: 192.0.2.10
    tags: &shared
      - web
  - name: db-01
    host: 192.0.2.11
    tags: *shared
`);
    expect(result.ok).toBe(false);
    expect(['unsafeYaml', 'yamlParse']).toContain(result.issues[0]?.code);
  });

  it('parses YAML that browsers send as text/plain', () => {
    const result = parseConfiguration(validYaml, 'yaml');
    expect(result.ok).toBe(true);
    expect(result.servers[0]?.port).toBe(22);
    expect(result.servers[0]?.groupName).toBe('production');
    expect(result.warnings).toContain('deprecatedGroup');
  });

  it('maps space to the organization field and keeps deprecated group as a warning', () => {
    const result = parseConfiguration(`version: 1
servers:
  - name: web-01
    host: 192.0.2.10
    space: production-web
`);
    expect(result.ok).toBe(true);
    expect(result.servers[0]?.groupName).toBe('production-web');
    expect(result.warnings).not.toContain('deprecatedGroup');
  });

  it('warns when group and space conflict', () => {
    const result = parseConfiguration(`version: 1
servers:
  - name: web-01
    host: 192.0.2.10
    group: production
    space: staging
`);
    expect(result.ok).toBe(true);
    expect(result.warnings).toContain('groupSpaceConflict');
    expect(result.servers[0]?.groupName).toBe('');
    expect(result.servers[0]?.spaceConflict).toBe(true);
  });

  it('maps a legacy environment field to space with a deprecation warning', () => {
    const result = parseConfiguration(`version: 1
servers:
  - name: web-01
    host: 192.0.2.10
    environment: staging
`);
    expect(result.ok).toBe(true);
    expect(result.servers[0]?.groupName).toBe('staging');
    expect(result.warnings).toContain('deprecatedEnvironment');
  });

  it('does not auto-pick a space when group, environment, and space conflict', () => {
    const result = parseConfiguration(`version: 1
servers:
  - name: web-01
    host: 192.0.2.10
    group: production
    environment: staging
    space: development
`);
    expect(result.ok).toBe(true);
    expect(result.warnings).toContain('groupSpaceConflict');
    expect(result.servers[0]?.groupName).toBe('');
    expect(result.servers[0]?.spaceConflict).toBe(true);
  });
});

describe('inspectFile', () => {
  it('rejects unsupported extensions', () => {
    expect(inspectFile(file('servers.txt', 'text/plain', 'a'))?.code).toBe('unsupportedFormat');
  });

  it('allows YAML with a text/plain MIME type', () => {
    expect(inspectFile(file('servers.yaml', 'text/plain', 'a: 1'))).toBeNull();
  });

  it('rejects files larger than 5 MB', () => {
    const huge = { name: 'servers.yaml', type: 'text/plain', size: 5 * 1024 * 1024 + 1 } as File;
    expect(inspectFile(huge)?.code).toBe('tooLarge');
  });

  it('rejects empty files', () => {
    expect(inspectFile(file('servers.json', 'application/json', ''))?.code).toBe('empty');
  });
});

function file(name: string, type: string, content: string) {
  return new File([content], name, { type });
}
