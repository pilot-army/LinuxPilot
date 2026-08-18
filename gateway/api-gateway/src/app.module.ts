import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppConfigService } from './config/app-config.service';
import { ConfigModule } from './config/config.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { CsrfGuard } from './common/guards/csrf.guard';
import {
  GatewayThrottlerGuard,
  skipUnlessPath,
  skipUnlessPathPrefix,
} from './common/guards/gateway-throttler.guard';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { LoggerModule } from './common/logger/logger.module';
import { AuthProxyModule } from './modules/auth/auth-proxy.module';
import { ServersProxyModule } from './modules/servers/servers-proxy.module';
import { OpenApiController } from './modules/docs/openapi.controller';
import { HealthController } from './modules/health/health.controller';

@Module({
  imports: [
    ConfigModule,
    LoggerModule,
    ThrottlerModule.forRootAsync({
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => ({
        throttlers: [
          { name: 'default', ttl: config.env.RATE_LIMIT_TTL_MS, limit: 300 },
          {
            name: 'login',
            ttl: config.env.LOGIN_RATE_LIMIT_TTL_MS,
            limit: config.env.LOGIN_RATE_LIMIT,
            skipIf: (context) => skipUnlessPath(context, 'POST', '/api/v1/auth/login'),
          },
          {
            name: 'refresh',
            ttl: config.env.REFRESH_RATE_LIMIT_TTL_MS,
            limit: config.env.REFRESH_RATE_LIMIT,
            skipIf: (context) => skipUnlessPath(context, 'POST', '/api/v1/auth/refresh'),
          },
          {
            name: 'agent',
            ttl: config.env.AGENT_RATE_LIMIT_TTL_MS,
            limit: config.env.AGENT_RATE_LIMIT,
            skipIf: (context) => skipUnlessPathPrefix(context, '/api/v1/agent'),
          },
        ],
      }),
    }),
    AuthProxyModule,
    ServersProxyModule,
  ],
  controllers: [HealthController, OpenApiController],
  providers: [
    { provide: APP_GUARD, useClass: GatewayThrottlerGuard },
    { provide: APP_GUARD, useClass: CsrfGuard },
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
  ],
})
export class AppModule {}
