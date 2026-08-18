import { describe, expect, it } from 'vitest';
import type { ServerGroup, ServerSummary } from '@linuxpilot/server-contracts';
import { parseConfiguration } from './parse';
import { buildPreviewRows, patchPreviewRow } from './validate';

const groups: ServerGroup[] = [
  {
    id: '11111111-1111-4111-8111-111111111111',
    name: 'production',
    description: '',
    color: '#35d5f2',
    tags: [],
    notificationsEnabled: false,
    version: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    serverCount: 1,
    onlineCount: 1,
    offlineCount: 0,
    warningCount: 0,
    withoutAgentCount: 0,
    averageCpuPercent: null,
    averageMemoryPercent: null,
    averageDiskPercent: null,
    memberNames: [],
  },
];

function summary(
  partial: Partial<ServerSummary> & Pick<ServerSummary, 'id' | 'name'>,
): ServerSummary {
  return {
    hostname: partial.hostname ?? partial.name,
    primaryIp: partial.primaryIp ?? '192.0.2.10',
    description: '',
    status: 'ONLINE',
    agentStatus: 'CONNECTED',
    osName: null,
    osVersion: null,
    kernelVersion: null,
    architecture: null,
    cpuCores: null,
    agentVersion: null,
    lastSeenAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    tags: [],
    groupId: null,
    groupName: null,
    maintenanceMode: false,
    version: 1,
    credentialId: null,
    cpuUsagePercent: null,
    memoryUsedBytes: null,
    memoryTotalBytes: null,
    diskUsedBytes: null,
    diskTotalBytes: null,
    uptimeSeconds: null,
    ...partial,
  };
}

describe('buildPreviewRows', () => {
  it('marks matching hostnames as duplicates and defaults to skip', () => {
    const parsed = parseConfiguration(`version: 1
servers:
  - name: web-production-01
    host: 192.0.2.10
    group: production
`);
    const rows = buildPreviewRows(
      parsed,
      [summary({ id: 'srv-1', name: 'web-production-01' })],
      groups,
    );
    expect(rows[0]?.status).toBe('duplicate');
    expect(rows[0]?.duplicateAction).toBe('skip');
    expect(rows[0]?.groupId).toBe(groups[0]?.id);
  });

  it('warns when the group is missing', () => {
    const parsed = parseConfiguration(`version: 1
servers:
  - name: web-01
    host: 192.0.2.10
    group: missing
`);
    const rows = buildPreviewRows(parsed, [], groups);
    expect(rows[0]?.status).toBe('warning');
    expect(rows[0]?.notes).toContain('missingGroup');
    expect(rows[0]?.groupId).toBeNull();
  });
});

describe('patchPreviewRow', () => {
  it('clears selection when the name is removed', () => {
    const parsed = parseConfiguration(`version: 1
servers:
  - name: web-01
    host: 192.0.2.10
`);
    const rows = buildPreviewRows(parsed, [], groups);
    const next = patchPreviewRow(rows, rows[0]!.key, { name: '   ' }, groups);
    expect(next[0]?.status).toBe('error');
    expect(next[0]?.selected).toBe(false);
  });
});
