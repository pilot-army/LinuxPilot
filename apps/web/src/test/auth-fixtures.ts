import { type PublicUser } from '@linuxpilot/auth-contracts';

export const testUser: PublicUser = {
  id: 'user-1',
  email: 'admin@example.com',
  username: 'admin',
  status: 'ACTIVE',
  roles: ['super_admin'],
  permissions: ['users.read'],
  createdAt: '2026-01-01T00:00:00.000Z',
};
