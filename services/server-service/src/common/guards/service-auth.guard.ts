import { type CanActivate, type ExecutionContext, Injectable } from '@nestjs/common';
import { AppError, HEADER_NAMES } from '@linuxpilot/common';
import { SERVER_ERROR_CODES } from '@linuxpilot/server-contracts';
import { type Request } from 'express';
import { AppConfigService } from '../../config/app-config.service';
import { serviceAuthTargetFromRequest, verifyServiceSignature } from '../security/service-auth';

type RequestWithRawBody = Request & { rawBody?: Buffer | string };

const PUBLIC_PATHS = new Set(['/health', '/ready']);

@Injectable()
export class ServiceAuthGuard implements CanActivate {
  constructor(private readonly config: AppConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestWithRawBody>();
    if (PUBLIC_PATHS.has(request.path)) {
      return true;
    }

    const timestamp = request.header(HEADER_NAMES.serviceTimestamp);
    const nonce = request.header(HEADER_NAMES.serviceNonce);
    const signature = request.header(HEADER_NAMES.serviceSignature);

    if (!timestamp || !nonce || !signature) {
      throw new AppError(SERVER_ERROR_CODES.UNAUTHORIZED, 'Service authentication required', 401);
    }
    if (!/^\d+$/.test(timestamp) || nonce.length < 16 || nonce.length > 128) {
      throw new AppError(SERVER_ERROR_CODES.UNAUTHORIZED, 'Service authentication required', 401);
    }

    const skew = Math.abs(Date.now() - Number(timestamp));
    if (skew > this.config.env.SERVICE_AUTH_MAX_SKEW_MS) {
      throw new AppError(SERVER_ERROR_CODES.UNAUTHORIZED, 'Service authentication required', 401);
    }

    const secrets = [
      this.config.env.SERVICE_AUTH_SECRET,
      this.config.env.SERVICE_AUTH_SECRET_PREVIOUS,
    ].filter((value): value is string => Boolean(value));

    const raw = request.rawBody ?? '';
    const target = serviceAuthTargetFromRequest(request.path, request.originalUrl || request.url);
    const valid = verifyServiceSignature(
      secrets,
      request.method,
      target,
      timestamp,
      nonce,
      signature,
      raw,
    );
    if (!valid) {
      throw new AppError(SERVER_ERROR_CODES.UNAUTHORIZED, 'Service authentication required', 401);
    }

    return true;
  }
}
