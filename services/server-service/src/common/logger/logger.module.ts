import { Global, Module } from '@nestjs/common';
import { createLogger } from '@linuxpilot/logger';
import { AppConfigService } from '../../config/app-config.service';
import { LOGGER } from './logger.token';

@Global()
@Module({
  providers: [
    {
      provide: LOGGER,
      useFactory: (config: AppConfigService) =>
        createLogger({
          name: 'server-service',
          level: config.env.LOG_LEVEL,
          pretty: config.env.NODE_ENV === 'development',
        }),
      inject: [AppConfigService],
    },
  ],
  exports: [LOGGER],
})
export class LoggerModule {}
