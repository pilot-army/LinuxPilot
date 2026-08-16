import { Inject, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { type Request } from 'express';
import { AppConfigService } from '../../config/app-config.service';
import { resolveClientIp } from '../http/client-ip';

@Injectable()
export class GatewayThrottlerGuard extends ThrottlerGuard {
  @Inject(AppConfigService)
  private readonly appConfig!: AppConfigService;

  protected override async getTracker(req: Request): Promise<string> {
    return resolveClientIp(req, this.appConfig.env);
  }
}
