import { AGENT_STATUSES, SERVER_STATUSES } from '@linuxpilot/server-contracts';
import { compareVersions, computeStatuses, isAgentOutdated } from './status';

const now = Date.parse('2026-08-16T12:00:00.000Z');

describe('computeStatuses', () => {
  it('marks a new server without an agent as pending and not installed', () => {
    expect(
      computeStatuses({
        status: SERVER_STATUSES.PENDING,
        currentCredentialId: null,
        lastSeenAt: null,
        offlineTimeoutMs: 90_000,
        now,
      }),
    ).toEqual({
      serverStatus: SERVER_STATUSES.PENDING,
      agentStatus: AGENT_STATUSES.NOT_INSTALLED,
    });
  });

  it('marks a valid heartbeat as online and connected', () => {
    expect(
      computeStatuses({
        status: SERVER_STATUSES.ONLINE,
        currentCredentialId: 'cred',
        lastSeenAt: new Date(now - 10_000),
        offlineTimeoutMs: 90_000,
        now,
      }),
    ).toEqual({
      serverStatus: SERVER_STATUSES.ONLINE,
      agentStatus: AGENT_STATUSES.CONNECTED,
    });
  });

  it('marks a stale heartbeat as offline and disconnected', () => {
    expect(
      computeStatuses({
        status: SERVER_STATUSES.ONLINE,
        currentCredentialId: 'cred',
        lastSeenAt: new Date(now - 120_000),
        offlineTimeoutMs: 90_000,
        now,
      }),
    ).toEqual({
      serverStatus: SERVER_STATUSES.OFFLINE,
      agentStatus: AGENT_STATUSES.DISCONNECTED,
    });
  });

  it('keeps revoked servers revoked', () => {
    expect(
      computeStatuses({
        status: SERVER_STATUSES.REVOKED,
        currentCredentialId: 'cred',
        lastSeenAt: new Date(now),
        offlineTimeoutMs: 90_000,
        now,
      }),
    ).toEqual({
      serverStatus: SERVER_STATUSES.REVOKED,
      agentStatus: AGENT_STATUSES.REVOKED,
    });
  });

  it('does not emit an offline status while maintenance is active', () => {
    expect(
      computeStatuses({
        status: SERVER_STATUSES.ONLINE,
        currentCredentialId: 'cred',
        lastSeenAt: new Date(now - 120_000),
        maintenanceMode: true,
        offlineTimeoutMs: 90_000,
        now,
      }),
    ).toEqual({
      serverStatus: SERVER_STATUSES.MAINTENANCE,
      agentStatus: AGENT_STATUSES.DISCONNECTED,
    });
  });

  it('marks an outdated agent as degraded unless a more critical reason exists', () => {
    expect(
      computeStatuses({
        status: SERVER_STATUSES.ONLINE,
        currentCredentialId: 'cred',
        lastSeenAt: new Date(now - 5_000),
        agentVersion: '0.1.0',
        minSupportedAgentVersion: '1.0.0',
        offlineTimeoutMs: 90_000,
        now,
      }),
    ).toEqual({
      serverStatus: SERVER_STATUSES.DEGRADED,
      agentStatus: AGENT_STATUSES.OUTDATED,
    });
  });

  it('prefers offline over outdated when the heartbeat is stale', () => {
    expect(
      computeStatuses({
        status: SERVER_STATUSES.ONLINE,
        currentCredentialId: 'cred',
        lastSeenAt: new Date(now - 200_000),
        agentVersion: '0.1.0',
        minSupportedAgentVersion: '1.0.0',
        offlineTimeoutMs: 90_000,
        now,
      }).serverStatus,
    ).toBe(SERVER_STATUSES.OFFLINE);
  });
});

describe('isAgentOutdated', () => {
  it('compares dotted versions', () => {
    expect(compareVersions('1.8.2', '1.8.2')).toBe(0);
    expect(isAgentOutdated('1.7.0', '1.8.0')).toBe(true);
    expect(isAgentOutdated('1.8.0', '1.8.0')).toBe(false);
    expect(isAgentOutdated(null, '1.0.0')).toBe(false);
  });
});
