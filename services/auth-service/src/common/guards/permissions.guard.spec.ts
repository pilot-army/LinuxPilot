import { AUTH_ERROR_CODES, PERMISSIONS } from '@linuxpilot/auth-contracts';
import { type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from './permissions.guard';
import { ALLOW_AUTHENTICATED_KEY } from '../decorators/allow-authenticated.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';

function contextWithUser(user?: { permissions: string[] }): ExecutionContext {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as unknown as ExecutionContext;
}

describe('PermissionsGuard', () => {
  it('allows a public route', () => {
    const reflector = {
      getAllAndOverride: (key: string) => key === IS_PUBLIC_KEY,
    } as unknown as Reflector;
    expect(new PermissionsGuard(reflector).canActivate(contextWithUser())).toBe(true);
  });

  it('allows an authenticated self-service route', () => {
    const reflector = {
      getAllAndOverride: (key: string) => key === ALLOW_AUTHENTICATED_KEY,
    } as unknown as Reflector;
    expect(new PermissionsGuard(reflector).canActivate(contextWithUser({ permissions: [] }))).toBe(
      true,
    );
  });

  it('denies a missing permission without listing the required codes', () => {
    const reflector = {
      getAllAndOverride: (key: string) =>
        key === PERMISSIONS_KEY ? [PERMISSIONS.USERS_UPDATE] : undefined,
    } as unknown as Reflector;

    try {
      new PermissionsGuard(reflector).canActivate(
        contextWithUser({ permissions: [PERMISSIONS.USERS_VIEW] }),
      );
      throw new Error('expected deny');
    } catch (error) {
      expect(error).toMatchObject({
        code: AUTH_ERROR_CODES.FORBIDDEN,
        details: [],
      });
      expect(JSON.stringify(error)).not.toContain(PERMISSIONS.USERS_UPDATE);
    }
  });

  it('default-denies routes without an explicit policy', () => {
    const reflector = {
      getAllAndOverride: () => undefined,
    } as unknown as Reflector;

    expect(() =>
      new PermissionsGuard(reflector).canActivate(contextWithUser({ permissions: ['users.view'] })),
    ).toThrow(expect.objectContaining({ code: AUTH_ERROR_CODES.FORBIDDEN }));
  });
});
