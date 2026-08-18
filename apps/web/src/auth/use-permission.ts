import { type PermissionCode } from '@linuxpilot/auth-contracts';
import { useAuth } from './AuthProvider';

export function usePermission(code: PermissionCode): boolean {
  const { user } = useAuth();
  return user?.permissions.includes(code) ?? false;
}
