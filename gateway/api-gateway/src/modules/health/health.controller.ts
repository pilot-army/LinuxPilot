import { Controller, Get, Inject } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { type AppLogger } from '@linuxpilot/logger';
import { AppConfigService } from '../../config/app-config.service';
import { LOGGER } from '../../common/logger/logger.token';

@Controller()
@SkipThrottle()
export class HealthController {
  constructor(
    private readonly config: AppConfigService,
    @Inject(LOGGER) private readonly logger: AppLogger,
  ) {}

  @Get(['health', 'api/v1/health'])
  async check() {
    let authService = 'unknown';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.env.AUTH_SERVICE_TIMEOUT_MS);
    try {
      const response = await fetch(`${this.config.env.AUTH_SERVICE_URL}/health`, {
        signal: controller.signal,
      });
      authService = response.ok ? 'ok' : 'degraded';
    } catch (error) {
      this.logger.warn({ err: error }, 'Auth service health check failed');
      authService = 'unavailable';
    } finally {
      clearTimeout(timeout);
    }

    return {
      status: authService === 'ok' ? 'ok' : 'degraded',
      service: 'api-gateway',
      dependencies: { authService },
    };
  }
}
