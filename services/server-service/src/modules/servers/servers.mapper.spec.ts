import { SERVER_STATUSES } from '@linuxpilot/server-contracts';
import { effectiveStatus } from './servers.mapper';

describe('effectiveStatus', () => {
  const now = Date.parse('2026-08-16T12:00:00.000Z');

  it('keeps pending servers without a heartbeat pending', () => {
    expect(
      effectiveStatus(
        {
          status: SERVER_STATUSES.PENDING,
          lastSeenAt: null,
          deletedAt: null,
          currentCredentialId: null,
          maintenanceMode: false,
          agentVersion: null,
          agentStatus: 'NOT_INSTALLED',
        },
        90_000,
        now,
      ),
    ).toBe(SERVER_STATUSES.PENDING);
  });

  it('marks stale online servers offline without a full table scan', () => {
    expect(
      effectiveStatus(
        {
          status: SERVER_STATUSES.ONLINE,
          lastSeenAt: new Date(now - 120_000),
          deletedAt: null,
          currentCredentialId: 'cred',
          maintenanceMode: false,
          agentVersion: '1.0.0',
          agentStatus: 'CONNECTED',
        },
        90_000,
        now,
      ),
    ).toBe(SERVER_STATUSES.OFFLINE);
  });

  it('keeps revoked servers revoked', () => {
    expect(
      effectiveStatus(
        {
          status: SERVER_STATUSES.REVOKED,
          lastSeenAt: new Date(now),
          deletedAt: null,
          currentCredentialId: 'cred',
          maintenanceMode: false,
          agentVersion: '1.0.0',
          agentStatus: 'REVOKED',
        },
        90_000,
        now,
      ),
    ).toBe(SERVER_STATUSES.REVOKED);
  });

  it('surfaces maintenance instead of offline', () => {
    expect(
      effectiveStatus(
        {
          status: SERVER_STATUSES.ONLINE,
          lastSeenAt: new Date(now - 120_000),
          deletedAt: null,
          currentCredentialId: 'cred',
          maintenanceMode: true,
          agentVersion: '1.0.0',
          agentStatus: 'DISCONNECTED',
        },
        90_000,
        now,
      ),
    ).toBe(SERVER_STATUSES.MAINTENANCE);
  });
});
