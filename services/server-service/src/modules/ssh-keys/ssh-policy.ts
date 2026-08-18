import { SERVER_ERROR_CODES } from '@linuxpilot/server-contracts';
import { AppError } from '@linuxpilot/common';

const LOOPBACK_V4 = /^(?:127|0)\./;
const LINK_LOCAL_V4 = /^169\.254\./;
const METADATA_V4 = /^169\.254\.169\.254$/;
const CGNAT = /^100\.(?:6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./;
const DEFAULT_HOME_PATH = '~/.ssh/authorized_keys';
const HOME_PATH = /^~\/\.ssh\/authorized_keys$/;
const ABS_HOME_PATH = /^\/home\/([a-z_][a-z0-9_-]{0,31})\/\.ssh\/authorized_keys$/;
const ROOT_HOME_PATH = /^\/root\/\.ssh\/authorized_keys$/;

export function assertSafeSshTarget(
  ip: string | null | undefined,
  port: number | null | undefined,
) {
  if (port !== null && port !== undefined && (port < 1 || port > 65535 || port === 0)) {
    throw new AppError(SERVER_ERROR_CODES.SSH_KEY_FORBIDDEN_TARGET, 'SSH port is not allowed', 400);
  }
  if (!ip) {
    return;
  }
  const trimmed = ip.trim().toLowerCase();
  if (isForbiddenSshAddress(trimmed)) {
    throw new AppError(
      SERVER_ERROR_CODES.SSH_KEY_FORBIDDEN_TARGET,
      'This server address cannot be used for SSH operations',
      400,
    );
  }
}

export function isForbiddenSshAddress(value: string): boolean {
  const ip = unwrapIpv4Mapped(value);
  if (
    ip === '::1' ||
    ip === '0.0.0.0' ||
    ip === '::' ||
    ip.startsWith('fe80:') ||
    ip.startsWith('fc') ||
    ip.startsWith('fd') ||
    METADATA_V4.test(ip) ||
    LOOPBACK_V4.test(ip) ||
    LINK_LOCAL_V4.test(ip) ||
    CGNAT.test(ip)
  ) {
    return true;
  }
  return false;
}

export function normalizeAuthorizedKeysPath(path: string, sshUser: string): string {
  const trimmed = path.trim();
  if (trimmed === DEFAULT_HOME_PATH || HOME_PATH.test(trimmed)) {
    return DEFAULT_HOME_PATH;
  }
  const home = ABS_HOME_PATH.exec(trimmed);
  if (home && home[1] === sshUser && sshUser !== 'root') {
    return trimmed;
  }
  if (sshUser === 'root' && ROOT_HOME_PATH.test(trimmed)) {
    return trimmed;
  }
  throw new AppError(
    SERVER_ERROR_CODES.SSH_KEY_PATH_INVALID,
    'authorized_keys path is not allowed',
    400,
  );
}

function unwrapIpv4Mapped(value: string): string {
  const mapped = value.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
  return mapped?.[1] ?? value;
}
