import { describe, expect, it } from 'vitest';
import { SERVER_STATUSES, type ServerSummary } from '@linuxpilot/server-contracts';
import { hasInstalledAgent, matchesClientFilters, metricTone, ratioToPercent } from './compute';

function server(
  partial: Partial<ServerSummary> & Pick<ServerSummary, 'id' | 'name'>,
): ServerSummary {
  return {
    hostname: partial.hostname ?? partial.name,
    description: '',
    status: SERVER_STATUSES.ONLINE,
    osName: 'Ubuntu',
    osVersion: '24.04',
    kernelVersion: null,
    architecture: null,
    agentVersion: '1.2.0',
    lastSeenAt: '2026-08-16T09:00:00.000Z',
    createdAt: '2026-08-16T08:00:00.000Z',
    updatedAt: '2026-08-16T09:00:00.000Z',
    tags: ['web'],
    primaryIp: null,
    agentStatus: 'CONNECTED',
    groupId: null,
    groupName: null,
    spaceId: null,
    spaceName: null,
    maintenanceMode: false,
    version: 1,
    cpuCores: null,
    credentialId: null,
    cpuUsagePercent: 38,
    memoryUsedBytes: 52,
    memoryTotalBytes: 100,
    diskUsedBytes: 40,
    diskTotalBytes: 100,
    uptimeSeconds: 100,
    ...partial,
  };
}

describe('servers compute', () => {
  it('detects installed agents and missing metrics', () => {
    expect(hasInstalledAgent(server({ id: '1', name: 'a' }))).toBe(true);
    expect(
      hasInstalledAgent(server({ id: '2', name: 'b', agentVersion: null, lastSeenAt: null })),
    ).toBe(false);
    expect(ratioToPercent(null, 100)).toBeNull();
    expect(ratioToPercent(25, 100)).toBe(25);
    expect(metricTone(null)).toBe('empty');
    expect(metricTone(81)).toBe('warning');
    expect(metricTone(91)).toBe('critical');
  });

  it('filters by search text, tags, id, and OS', () => {
    const item = server({ id: 'srv-9', name: 'prod-web-01', tags: ['production'] });
    expect(matchesClientFilters(item, { q: 'prod', os: '' })).toBe(true);
    expect(matchesClientFilters(item, { q: 'production', os: '' })).toBe(true);
    expect(matchesClientFilters(item, { q: 'srv-9', os: '' })).toBe(true);
    expect(matchesClientFilters(item, { q: 'prod', os: 'Debian' })).toBe(false);
    expect(matchesClientFilters(item, { q: 'missing', os: '' })).toBe(false);
    expect(
      matchesClientFilters(server({ id: '3', name: 'edge', primaryIp: '10.0.1.11' }), {
        q: '10.0.1',
        os: '',
      }),
    ).toBe(true);
    expect(matchesClientFilters(item, { q: '', os: '', agent: 'missing' })).toBe(false);
    expect(
      matchesClientFilters(server({ id: '4', name: 'db', spaceId: 'space-1' }), {
        q: '',
        os: '',
        spaceId: 'space-1',
      }),
    ).toBe(true);
    expect(
      matchesClientFilters(server({ id: '4', name: 'db', spaceId: 'space-1' }), {
        q: '',
        os: '',
        spaceId: 'space-2',
      }),
    ).toBe(false);
  });
});
