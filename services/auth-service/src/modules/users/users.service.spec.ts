import { AUTH_ERROR_CODES, USER_STATUSES } from '@linuxpilot/auth-contracts';
import { UsersService } from './users.service';
import { type UsersRepository } from './users.repository';
import { type SessionsService } from '../sessions/sessions.service';
import { type RolesService } from '../roles/roles.service';

describe('UsersService', () => {
  it('looks up usernames by the normalized unique key', async () => {
    const usersRepository = {
      findByUsernameNormalizedWithAccess: jest.fn().mockResolvedValue(null),
      findByEmailWithAccess: jest.fn(),
    };
    const service = new UsersService(
      usersRepository as unknown as UsersRepository,
      { revokeAllForUser: jest.fn() } as unknown as SessionsService,
      {} as RolesService,
    );

    await service.findForLogin('  Admin ');
    expect(usersRepository.findByUsernameNormalizedWithAccess).toHaveBeenCalledWith('admin');
    expect(usersRepository.findByEmailWithAccess).not.toHaveBeenCalled();
  });

  it('treats an invalid username as a miss so login cannot enumerate format errors', async () => {
    const usersRepository = {
      findByUsernameNormalizedWithAccess: jest.fn(),
    };
    const service = new UsersService(
      usersRepository as unknown as UsersRepository,
      { revokeAllForUser: jest.fn() } as unknown as SessionsService,
      {} as RolesService,
    );

    await expect(service.findForLogin('bad user')).resolves.toBeNull();
    expect(usersRepository.findByUsernameNormalizedWithAccess).not.toHaveBeenCalled();
  });

  it('revokes every session when a user is blocked', async () => {
    const sessionsService = { revokeAllForUser: jest.fn() };
    const user = {
      id: '11111111-1111-4111-8111-111111111111',
      email: 'admin@example.com',
      username: 'admin',
      status: USER_STATUSES.ACTIVE,
      passwordHash: 'x',
      createdAt: new Date(),
      roles: [],
    };
    const usersRepository = {
      findByIdWithAccess: jest
        .fn()
        .mockResolvedValueOnce(user)
        .mockResolvedValueOnce({ ...user, status: USER_STATUSES.BLOCKED, roles: [] }),
      updateStatus: jest.fn().mockResolvedValue({ ...user, status: USER_STATUSES.BLOCKED }),
    };
    const service = new UsersService(
      usersRepository as unknown as UsersRepository,
      sessionsService as unknown as SessionsService,
      {} as RolesService,
    );

    await service.changeStatus(user.id, USER_STATUSES.BLOCKED);
    expect(sessionsService.revokeAllForUser).toHaveBeenCalledWith(user.id);
  });

  it('rejects pending and blocked accounts on authenticated access', () => {
    const service = new UsersService(
      {} as UsersRepository,
      {} as SessionsService,
      {} as RolesService,
    );
    expect(() => service.assertUserCanAuthenticate(USER_STATUSES.PENDING)).toThrow(
      expect.objectContaining({ code: AUTH_ERROR_CODES.ACCOUNT_PENDING }),
    );
    expect(() => service.assertUserCanAuthenticate(USER_STATUSES.BLOCKED)).toThrow(
      expect.objectContaining({ code: AUTH_ERROR_CODES.ACCOUNT_BLOCKED }),
    );
  });
});
