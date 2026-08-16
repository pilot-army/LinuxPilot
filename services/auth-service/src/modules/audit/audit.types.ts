export const AUDIT_ACTIONS = {
  LOGIN_SUCCESS: 'auth.login.success',
  LOGIN_FAILURE: 'auth.login.failure',
  LOGOUT: 'auth.logout',
  REFRESH_REUSE: 'auth.refresh.reuse',
  SESSION_REVOKE: 'auth.session.revoke',
  SESSION_REVOKE_ALL: 'auth.session.revoke_all',
  USER_STATUS_CHANGE: 'user.status.change',
  USER_ROLES_CHANGE: 'user.roles.change',
} as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];

export type AuditEntry = {
  actorId?: string;
  action: AuditAction | string;
  targetType: string;
  targetId?: string;
  requestId?: string;
  ipAddress?: string;
  metadata?: Record<string, unknown>;
};
