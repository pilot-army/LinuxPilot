import { ALL_PERMISSIONS, PERMISSIONS, type PermissionCode } from './permissions';

export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  OPERATOR: 'operator',
  VIEWER: 'viewer',
} as const;

export type RoleName = (typeof ROLES)[keyof typeof ROLES];

export const ALL_ROLES: readonly RoleName[] = Object.values(ROLES);

export const ROLE_DESCRIPTIONS: Record<RoleName, string> = {
  [ROLES.SUPER_ADMIN]: 'Full platform access, including user administration',
  [ROLES.ADMIN]: 'Administrative access without deleting users',
  [ROLES.OPERATOR]: 'Operate servers, containers, databases, and services',
  [ROLES.VIEWER]: 'Read-only access to inventory and logs',
};

export const ROLE_PERMISSIONS: Record<RoleName, readonly PermissionCode[]> = {
  [ROLES.SUPER_ADMIN]: ALL_PERMISSIONS,
  [ROLES.ADMIN]: ALL_PERMISSIONS.filter((code) => code !== PERMISSIONS.USERS_DELETE),
  [ROLES.OPERATOR]: [
    PERMISSIONS.USERS_VIEW,
    PERMISSIONS.SERVERS_VIEW,
    PERMISSIONS.SERVERS_UPDATE,
    PERMISSIONS.TERMINAL_OPEN,
    PERMISSIONS.DOCKER_VIEW,
    PERMISSIONS.DOCKER_MANAGE,
    PERMISSIONS.DATABASES_VIEW,
    PERMISSIONS.DATABASES_MANAGE,
    PERMISSIONS.SERVICES_VIEW,
    PERMISSIONS.SERVICES_MANAGE,
    PERMISSIONS.LOGS_VIEW,
  ],
  [ROLES.VIEWER]: [
    PERMISSIONS.USERS_VIEW,
    PERMISSIONS.SERVERS_VIEW,
    PERMISSIONS.DOCKER_VIEW,
    PERMISSIONS.DATABASES_VIEW,
    PERMISSIONS.SERVICES_VIEW,
    PERMISSIONS.LOGS_VIEW,
    PERMISSIONS.AUDIT_VIEW,
  ],
};
