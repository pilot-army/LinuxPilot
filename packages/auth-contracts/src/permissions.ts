export const PERMISSIONS = {
  USERS_VIEW: 'users.view',
  USERS_CREATE: 'users.create',
  USERS_UPDATE: 'users.update',
  USERS_DELETE: 'users.delete',
  SERVERS_VIEW: 'servers.view',
  SERVERS_CREATE: 'servers.create',
  SERVERS_UPDATE: 'servers.update',
  SERVERS_DELETE: 'servers.delete',
  TERMINAL_OPEN: 'terminal.open',
  DOCKER_VIEW: 'docker.view',
  DOCKER_MANAGE: 'docker.manage',
  DATABASES_VIEW: 'databases.view',
  DATABASES_MANAGE: 'databases.manage',
  SERVICES_VIEW: 'services.view',
  SERVICES_MANAGE: 'services.manage',
  LOGS_VIEW: 'logs.view',
  AUDIT_VIEW: 'audit.view',
} as const;

export type PermissionCode = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ALL_PERMISSIONS: readonly PermissionCode[] = Object.values(PERMISSIONS);

export const PERMISSION_DESCRIPTIONS: Record<PermissionCode, string> = {
  [PERMISSIONS.USERS_VIEW]: 'View users',
  [PERMISSIONS.USERS_CREATE]: 'Create users',
  [PERMISSIONS.USERS_UPDATE]: 'Update users',
  [PERMISSIONS.USERS_DELETE]: 'Delete users',
  [PERMISSIONS.SERVERS_VIEW]: 'View servers',
  [PERMISSIONS.SERVERS_CREATE]: 'Register servers',
  [PERMISSIONS.SERVERS_UPDATE]: 'Update servers',
  [PERMISSIONS.SERVERS_DELETE]: 'Remove servers',
  [PERMISSIONS.TERMINAL_OPEN]: 'Open a remote terminal',
  [PERMISSIONS.DOCKER_VIEW]: 'View Docker resources',
  [PERMISSIONS.DOCKER_MANAGE]: 'Manage Docker resources',
  [PERMISSIONS.DATABASES_VIEW]: 'View databases',
  [PERMISSIONS.DATABASES_MANAGE]: 'Manage databases',
  [PERMISSIONS.SERVICES_VIEW]: 'View systemd services',
  [PERMISSIONS.SERVICES_MANAGE]: 'Manage systemd services',
  [PERMISSIONS.LOGS_VIEW]: 'View logs',
  [PERMISSIONS.AUDIT_VIEW]: 'View audit events',
};
