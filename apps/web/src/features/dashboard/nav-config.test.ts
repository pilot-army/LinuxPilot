import { describe, expect, it } from 'vitest';
import { isPathActive, isServersSection } from './nav-config';

describe('isPathActive', () => {
  it('marks All servers for the list and a server detail', () => {
    expect(isPathActive('/servers', '/servers')).toBe(true);
    expect(isPathActive('/servers/abc', '/servers')).toBe(true);
    expect(isPathActive('/server-spaces', '/servers')).toBe(false);
    expect(isPathActive('/server-groups', '/servers')).toBe(false);
    expect(isPathActive('/dashboard', '/servers')).toBe(false);
  });

  it('marks nested leaves only for their own routes', () => {
    expect(isPathActive('/server-spaces', '/server-spaces')).toBe(true);
    expect(isPathActive('/server-groups', '/server-groups')).toBe(true);
    expect(isPathActive('/server-operations', '/server-operations')).toBe(true);
    expect(isPathActive('/server-audit', '/server-audit')).toBe(true);
    expect(isPathActive('/server-ssh-keys', '/server-ssh-keys')).toBe(true);
    expect(isPathActive('/servers', '/server-spaces')).toBe(false);
    expect(isPathActive('/servers', '/server-groups')).toBe(false);
  });
});

describe('isServersSection', () => {
  it('covers every servers microservice route', () => {
    expect(isServersSection('/servers')).toBe(true);
    expect(isServersSection('/servers/abc')).toBe(true);
    expect(isServersSection('/server-spaces')).toBe(true);
    expect(isServersSection('/server-groups')).toBe(true);
    expect(isServersSection('/server-operations')).toBe(true);
    expect(isServersSection('/server-audit')).toBe(true);
    expect(isServersSection('/server-ssh-keys')).toBe(true);
    expect(isServersSection('/dashboard')).toBe(false);
  });
});
