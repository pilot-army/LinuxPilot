import 'reflect-metadata';
import { config as loadDotenv } from 'dotenv';
import { NestFactory } from '@nestjs/core';
import { type NestExpressApplication } from '@nestjs/platform-express';
import { REQUEST_BODY_LIMIT } from '@linuxpilot/common';
import { createLogger, type AppLogger } from '@linuxpilot/logger';
import { AppModule } from './app.module';
import { loadAuthEnv } from './config/env';
import { LOGGER } from './common/logger/logger.token';
import { requestIdMiddleware } from './common/middleware/request-id.middleware';

loadDotenv();

async function bootstrap(): Promise<void> {
  const env = loadAuthEnv();
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: false,
    rawBody: true,
  });

  app.useBodyParser('json', { limit: REQUEST_BODY_LIMIT });
  app.disable('x-powered-by');

  const logger = app.get<AppLogger>(LOGGER);
  app.use(requestIdMiddleware);
  app.enableShutdownHooks();

  const server = await app.listen(env.AUTH_SERVICE_PORT, env.AUTH_SERVICE_HOST);
  server.keepAliveTimeout = 65_000;
  logger.info({ port: env.AUTH_SERVICE_PORT, host: env.AUTH_SERVICE_HOST }, 'Auth service started');

  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Received shutdown signal');
    await app.close();
    process.exit(0);
  };

  process.on('SIGTERM', () => {
    void shutdown('SIGTERM');
  });
  process.on('SIGINT', () => {
    void shutdown('SIGINT');
  });
}

bootstrap().catch((error: unknown) => {
  const logger = createLogger({ name: 'auth-service', level: 'error' });
  logger.error({ err: error }, 'Auth service failed to start');
  process.exit(1);
});
