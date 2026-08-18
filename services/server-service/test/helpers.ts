import { PERMISSIONS } from '@linuxpilot/auth-contracts';
import { HEADER_NAMES } from '@linuxpilot/common';
import { signServiceRequest, serviceAuthHeaderRecord } from '@linuxpilot/common/service-auth';
import { sign } from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';

export function signedHeaders(
  method: string,
  path: string,
  body?: unknown,
): Record<string, string> {
  const serialized = body === undefined ? '' : JSON.stringify(body);
  const signed = signServiceRequest(
    process.env.SERVICE_AUTH_SECRET as string,
    method,
    path,
    serialized,
  );
  return {
    ...serviceAuthHeaderRecord(signed),
    [HEADER_NAMES.requestId]: randomUUID(),
  };
}

export function accessToken(permissions: string[], userId = randomUUID()): string {
  return sign(
    {
      sub: userId,
      sid: randomUUID(),
      email: 'tester@example.com',
      username: 'tester',
      roles: ['custom'],
      permissions,
    },
    process.env.JWT_ACCESS_PRIVATE_KEY as string,
    {
      algorithm: 'RS256',
      issuer: process.env.JWT_ISSUER,
      audience: process.env.JWT_AUDIENCE,
      expiresIn: '15m',
    },
  );
}

export const adminToken = () =>
  accessToken([
    PERMISSIONS.SERVERS_VIEW,
    PERMISSIONS.SERVERS_CREATE,
    PERMISSIONS.SERVERS_UPDATE,
    PERMISSIONS.SERVERS_DELETE,
    PERMISSIONS.SSH_KEYS_READ,
    PERMISSIONS.SSH_KEYS_CREATE,
    PERMISSIONS.SSH_KEYS_UPDATE,
    PERMISSIONS.SSH_KEYS_USE,
    PERMISSIONS.SSH_KEYS_ROTATE,
    PERMISSIONS.SSH_KEYS_DISABLE,
    PERMISSIONS.SSH_KEYS_DELETE,
    PERMISSIONS.SSH_KEYS_INSTALL,
  ]);

export const viewerToken = () => accessToken([PERMISSIONS.SERVERS_VIEW]);

export function authHeaders(token: string, method: string, path: string, body?: unknown) {
  return {
    ...signedHeaders(method, path, body),
    authorization: `Bearer ${token}`,
  };
}

export function sampleHeartbeat(overrides: Record<string, unknown> = {}) {
  return {
    hostname: 'edge-01',
    osName: 'Debian GNU/Linux',
    osVersion: '12',
    kernelVersion: '6.1.0',
    architecture: 'x86_64',
    agentVersion: '0.1.0',
    cpuUsagePercent: 12.5,
    load1: 0.2,
    load5: 0.3,
    load15: 0.1,
    memoryUsedBytes: 2_000_000_000,
    memoryTotalBytes: 8_000_000_000,
    swapUsedBytes: 0,
    swapTotalBytes: 1_000_000_000,
    uptimeSeconds: 3600,
    processCount: 120,
    disks: [
      {
        mountPoint: '/',
        filesystem: 'ext4',
        usedBytes: 20_000_000_000,
        totalBytes: 100_000_000_000,
        usedPercent: 20,
      },
    ],
    ...overrides,
  };
}
