import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiRequestError } from '../../api/client';
import { importReportCsv, importSelectedServers, toCreatePayload } from './run-import';
import type { PreviewRow } from './types';

const { createServerMock, updateServerMock } = vi.hoisted(() => ({
  createServerMock: vi.fn(),
  updateServerMock: vi.fn(),
}));

vi.mock('../../api/servers', () => ({
  createServer: createServerMock,
  updateServer: updateServerMock,
}));

function row(overrides: Partial<PreviewRow> = {}): PreviewRow {
  return {
    key: 'web-01-0',
    name: 'web-01',
    host: '192.0.2.10',
    hostname: '',
    primaryIp: '192.0.2.10',
    port: 22,
    username: 'linuxpilot',
    authType: 'ssh_key',
    credentialId: 'existing-credential-id',
    groupName: 'production',
    tags: ['web'],
    description: '',
    secretsStripped: false,
    unknownFields: [],
    selected: true,
    status: 'ready',
    duplicateId: null,
    duplicateAction: 'create',
    groupId: null,
    notes: [],
    ...overrides,
  };
}

describe('toCreatePayload', () => {
  it('maps inventory fields and omits SSH secrets', () => {
    const payload = toCreatePayload(row());
    expect(payload).toEqual({
      name: 'web-01',
      description: '',
      hostname: undefined,
      primaryIp: '192.0.2.10',
      spaceId: undefined,
      tags: ['web'],
      autoDetectSystem: true,
    });
    expect(payload).not.toHaveProperty('password');
    expect(payload).not.toHaveProperty('privateKey');
    expect(payload).not.toHaveProperty('username');
    expect(payload).not.toHaveProperty('port');
  });
});

describe('importSelectedServers', () => {
  beforeEach(() => {
    createServerMock.mockReset();
    updateServerMock.mockReset();
    createServerMock.mockResolvedValue({ id: 'srv-1' });
    updateServerMock.mockResolvedValue({ id: 'srv-2' });
  });

  it('creates selected servers sequentially and keeps partial failures', async () => {
    createServerMock
      .mockResolvedValueOnce({ id: 'srv-1' })
      .mockRejectedValueOnce(new ApiRequestError(403, 'FORBIDDEN', 'no'));
    const result = await importSelectedServers([
      row({ key: 'a', name: 'ok-01' }),
      row({ key: 'b', name: 'no-01' }),
    ]);
    expect(result.map((item) => item.result)).toEqual(['created', 'failed']);
    expect(result[1]?.error).toBe('forbidden');
    expect(createServerMock).toHaveBeenCalledTimes(2);
  });

  it('skips duplicates by default and can update an existing server', async () => {
    const skipped = await importSelectedServers([
      row({ status: 'duplicate', duplicateAction: 'skip', duplicateId: 'srv-2' }),
    ]);
    expect(skipped[0]?.result).toBe('skipped');
    expect(createServerMock).not.toHaveBeenCalled();

    const updated = await importSelectedServers([
      row({ status: 'duplicate', duplicateAction: 'update', duplicateId: 'srv-2' }),
    ]);
    expect(updated[0]?.result).toBe('updated');
    expect(updateServerMock).toHaveBeenCalledWith(
      'srv-2',
      expect.objectContaining({ name: 'web-01' }),
    );
  });

  it('builds a CSV report without configuration bodies', () => {
    const csv = importReportCsv([
      { key: 'a', name: 'web-01', result: 'created' },
      { key: 'b', name: 'db-01', result: 'failed', error: 'forbidden' },
    ]);
    expect(csv).toContain('"web-01",created');
    expect(csv).not.toContain('password');
  });
});
