export const USER_STATUSES = {
  ACTIVE: 'ACTIVE',
  BLOCKED: 'BLOCKED',
  PENDING: 'PENDING',
} as const;

export type UserStatus = (typeof USER_STATUSES)[keyof typeof USER_STATUSES];

export type PublicUser = {
  id: string;
  email: string;
  username: string;
  status: UserStatus;
  roles: string[];
  permissions: string[];
  createdAt: string;
};

export type AuthenticatedUser = {
  id: string;
  sessionId: string;
  email: string;
  username: string;
  roles: string[];
  permissions: string[];
};
