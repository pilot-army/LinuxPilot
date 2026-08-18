import { SetMetadata } from '@nestjs/common';
import { type PermissionCode } from '@linuxpilot/auth-contracts';

export const PERMISSIONS_KEY = 'requiredPermissions';

export const RequirePermissions = (...permissions: PermissionCode[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
