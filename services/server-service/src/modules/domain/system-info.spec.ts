import { UNKNOWN_SYSTEM_VALUE } from '@linuxpilot/server-contracts';
import {
  isUnknownSystemValue,
  normalizeArchitecture,
  normalizeOsField,
  resolveSystemInfoStatus,
} from './system-info';

describe('system info normalization', () => {
  it('normalizes supported architecture aliases', () => {
    expect(normalizeArchitecture('x86_64')).toBe('amd64');
    expect(normalizeArchitecture('X64')).toBe('amd64');
    expect(normalizeArchitecture('amd64')).toBe('amd64');
    expect(normalizeArchitecture('aarch64')).toBe('arm64');
    expect(normalizeArchitecture('arm64')).toBe('arm64');
  });

  it('rejects unsupported architectures instead of storing them', () => {
    expect(normalizeArchitecture('ppc64')).toBeNull();
    expect(normalizeArchitecture('riscv64')).toBeNull();
    expect(normalizeArchitecture('')).toBeNull();
  });

  it('keeps unknown OS values as unknown', () => {
    expect(normalizeOsField('')).toBe(UNKNOWN_SYSTEM_VALUE);
    expect(normalizeOsField('unknown')).toBe(UNKNOWN_SYSTEM_VALUE);
    expect(normalizeOsField('  Ubuntu  ')).toBe('Ubuntu');
  });

  it('marks connected servers without usable system data as unknown', () => {
    expect(
      resolveSystemInfoStatus({
        osName: UNKNOWN_SYSTEM_VALUE,
        architecture: 'amd64',
        lastSeenAt: new Date(),
      }),
    ).toBe('unknown');
    expect(
      resolveSystemInfoStatus({
        osName: 'Ubuntu',
        architecture: 'amd64',
        lastSeenAt: new Date(),
      }),
    ).toBe('detected');
    expect(
      resolveSystemInfoStatus({
        osName: null,
        architecture: null,
        lastSeenAt: null,
      }),
    ).toBe('pending');
    expect(isUnknownSystemValue(null)).toBe(true);
  });
});
