import 'reflect-metadata';
import { config as loadDotenv } from 'dotenv';
import { NestFactory } from '@nestjs/core';
import { type NestExpressApplication } from '@nestjs/platform-express';
import { installProcessGuards, listenWithRetry } from '@linuxpilot/common';
import { createLogger, type AppLogger } from '@linuxpilot/logger';
import { AppModule } from './app.module';
import { loadServerEnv } from './config/env';
import { LOGGER } from './common/logger/logger.token';
import { accessLogMiddleware } from './common/middleware/access-log.middleware';
import { requestIdMiddleware } from './common/middleware/request-id.middleware';

loadDotenv();

installProcessGuards({
  service: 'server-service',
  logger: createLogger({ name: 'server-service', level: 'error' }),
});

async function bootstrap(): Promise<void> {
  const env = loadServerEnv();
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: false,
    rawBody: true,
  });

  app.useBodyParser('json', { limit: `${Math.ceil(env.AGENT_REQUEST_BODY_LIMIT / 1024)}kb` });
  app.disable('x-powered-by');

  const logger = app.get<AppLogger>(LOGGER);
  app.use(requestIdMiddleware);
  app.use(accessLogMiddleware(logger));
  app.enableShutdownHooks();

  const server = await listenWithRetry(
    () => app.listen(env.SERVER_SERVICE_PORT, env.SERVER_SERVICE_HOST),
    {
      onRetry: (attempt, error) => {
        logger.warn({ attempt, err: error }, 'Listen address still in use, retrying');
      },
    },
  );
  server.keepAliveTimeout = 65_000;
  logger.info(
    { port: env.SERVER_SERVICE_PORT, host: env.SERVER_SERVICE_HOST },
    'Server service started',
  );

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
  const logger = createLogger({ name: 'server-service', level: 'error' });
  logger.error({ err: error }, 'Server service failed to start');
  process.exit(1);
});
