export const AUDIT_ACTIONS = {
  SERVER_CREATED: 'server.created',
  SERVER_UPDATED: 'server.updated',
  ENROLLMENT_TOKEN_GENERATED: 'server.enrollment_token.generated',
  ENROLLMENT_COMPLETED: 'server.enrollment.completed',
  ENROLLMENT_FAILED: 'server.enrollment.failed',
  CREDENTIAL_ROTATED: 'server.credential.rotated',
  CREDENTIAL_REVOKED: 'server.credential.revoked',
  SERVER_REVOKED: 'server.revoked',
  SERVER_DELETED: 'server.deleted',
  AGENT_AUTH_FAILED: 'server.agent.auth_failed',
  SERVER_ONLINE: 'server.status.online',
  SERVER_OFFLINE: 'server.status.offline',
  GROUP_CREATED: 'server.group.created',
  GROUP_UPDATED: 'server.group.updated',
  GROUP_DELETED: 'server.group.deleted',
  GROUP_ASSIGNED: 'server.group.assigned',
  SPACE_CREATED: 'server.space.created',
  SPACE_UPDATED: 'server.space.updated',
  SPACE_DELETED: 'server.space.deleted',
  SPACE_ASSIGNED: 'server.space.assigned',
  SPACE_CHANGED: 'server.space.changed',
  SPACE_REMOVED: 'server.space.removed',
  TAGS_UPDATED: 'server.tags.updated',
  MAINTENANCE_STARTED: 'server.maintenance.started',
  MAINTENANCE_ENDED: 'server.maintenance.ended',
  OPERATION_REQUESTED: 'server.operation.requested',
  OPERATION_CANCELLED: 'server.operation.cancelled',
  BULK_ACTION: 'server.bulk.action',
  SSH_KEY_CREATED: 'ssh_key.created',
  SSH_KEY_IMPORTED: 'ssh_key.imported',
  SSH_KEY_UPDATED: 'ssh_key.updated',
  SSH_KEY_USED: 'ssh_key.used',
  SSH_KEY_ASSIGNED: 'ssh_key.assigned',
  SSH_KEY_INSTALLED: 'ssh_key.installed',
  SSH_KEY_ROTATION_STARTED: 'ssh_key.rotation_started',
  SSH_KEY_ROTATED: 'ssh_key.rotated',
  SSH_KEY_DISABLED: 'ssh_key.disabled',
  SSH_KEY_DELETED: 'ssh_key.deleted',
  SSH_KEY_ACCESS_DENIED: 'ssh_key.access_denied',
} as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];

export type AuditEntry = {
  actorId?: string;
  action: AuditAction | string;
  targetType: string;
  targetId?: string;
  serverId?: string;
  requestId?: string;
  ipAddress?: string;
  metadata?: Record<string, unknown>;
};
