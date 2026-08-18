import { SERVER_ERROR_CODES } from '@linuxpilot/server-contracts';
import {
  assertSafeSshTarget,
  isForbiddenSshAddress,
  normalizeAuthorizedKeysPath,
} from './ssh-policy';

describe('ssh-policy', () => {
  it('blocks loopback, link-local, metadata, and IPv4-mapped loopback', () => {
    expect(isForbiddenSshAddress('127.0.0.1')).toBe(true);
    expect(isForbiddenSshAddress('169.254.169.254')).toBe(true);
    expect(isForbiddenSshAddress('169.254.1.1')).toBe(true);
    expect(isForbiddenSshAddress('::1')).toBe(true);
    expect(isForbiddenSshAddress('::ffff:127.0.0.1')).toBe(true);
    expect(isForbiddenSshAddress('10.0.0.5')).toBe(false);
    expect(() => assertSafeSshTarget('127.0.0.1', 22)).toThrow(
      expect.objectContaining({ code: SERVER_ERROR_CODES.SSH_KEY_FORBIDDEN_TARGET }),
    );
  });

  it('allows only authorized_keys paths for the selected user', () => {
    expect(normalizeAuthorizedKeysPath('~/.ssh/authorized_keys', 'linuxpilot')).toBe(
      '~/.ssh/authorized_keys',
    );
    expect(normalizeAuthorizedKeysPath('/home/linuxpilot/.ssh/authorized_keys', 'linuxpilot')).toBe(
      '/home/linuxpilot/.ssh/authorized_keys',
    );
    expect(() => normalizeAuthorizedKeysPath('/etc/passwd', 'linuxpilot')).toThrow(
      expect.objectContaining({ code: SERVER_ERROR_CODES.SSH_KEY_PATH_INVALID }),
    );
    expect(() =>
      normalizeAuthorizedKeysPath('/home/other/.ssh/authorized_keys', 'linuxpilot'),
    ).toThrow();
  });
});
