import { parseForwardedFor, sanitizeIpAddress } from '@linuxpilot/common';
import { type Request } from 'express';
import { type GatewayEnv } from '../../config/env.schema';

export function resolveClientIp(request: Request, env: Pick<GatewayEnv, 'TRUST_PROXY'>): string {
  const socketIp = sanitizeIpAddress(request.socket.remoteAddress) ?? 'unknown';
  if (!env.TRUST_PROXY) {
    return socketIp;
  }

  const forwarded = parseForwardedFor(request.header('x-forwarded-for'));
  return forwarded ?? sanitizeIpAddress(request.ip) ?? socketIp;
}
