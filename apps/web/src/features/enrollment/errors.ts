import { ApiRequestError } from '../../api/client';

export function enrollmentErrorMessage(
  cause: unknown,
  copy: { network: string; forbidden: string; generic: string },
): string {
  if (cause instanceof ApiRequestError) {
    if (cause.status === 0 || cause.code === 'NETWORK_ERROR') {
      return copy.network;
    }
    if (cause.status === 403) {
      return copy.forbidden;
    }
    if (cause.status === 409) {
      return copy.generic;
    }
  }
  return copy.generic;
}

export function isOffline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}
