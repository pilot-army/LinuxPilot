import { Inject, Injectable, type ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { type Request } from 'express';
import { AppConfigService } from '../../config/app-config.service';
import { resolveClientIp } from '../http/client-ip';

export function skipUnlessPath(
  context: ExecutionContext,
  method: string,
  path: string,
): boolean {
  const request = context.switchToHttp().getRequest<Request>();
  return request.method !== method || request.path !== path;
}

export function skipUnlessPathPrefix(context: ExecutionContext, prefix: string): boolean {
  const request = context.switchToHttp().getRequest<Request>();
  return !request.path.startsWith(prefix);
}

@Injectable()
export class GatewayThrottlerGuard extends ThrottlerGuard {
  @Inject(AppConfigService)
  private readonly appConfig!: AppConfigService;

  protected override async getTracker(req: Request): Promise<string> {
    return resolveClientIp(req, this.appConfig.env);
  }
}
