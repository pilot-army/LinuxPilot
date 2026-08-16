import 'reflect-metadata';
import { config as loadDotenv } from 'dotenv';
import { NestFactory } from '@nestjs/core';
import { type NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import { REQUEST_BODY_LIMIT } from '@linuxpilot/common';
import { createLogger, type AppLogger } from '@linuxpilot/logger';
import { AppModule } from './app.module';
import { loadGatewayEnv } from './config/env';
import { LOGGER } from './common/logger/logger.token';
import { accessLogMiddleware } from './common/middleware/access-log.middleware';
import { requestIdMiddleware } from './common/middleware/request-id.middleware';
import { securityHeadersMiddleware } from './common/middleware/security-headers.middleware';

loadDotenv();

async function bootstrap(): Promise<void> {
  const env = loadGatewayEnv();
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: false,
  });

  app.useBodyParser('json', { limit: REQUEST_BODY_LIMIT });
  app.disable('x-powered-by');
  app.set('trust proxy', env.TRUST_PROXY ? env.TRUST_PROXY_HOPS : false);

  const logger = app.get<AppLogger>(LOGGER);
  app.use(requestIdMiddleware);
  app.use(securityHeadersMiddleware(env));
  app.use(accessLogMiddleware(logger, env));
  app.use(cookieParser());
  app.enableCors({
    origin: env.FRONTEND_ORIGIN,
    credentials: true,
  });
  app.enableShutdownHooks();

  const server = await app.listen(env.GATEWAY_PORT, env.GATEWAY_HOST);
  server.keepAliveTimeout = 65_000;
  logger.info({ port: env.GATEWAY_PORT, origin: env.FRONTEND_ORIGIN }, 'API gateway started');

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
  const logger = createLogger({ name: 'api-gateway', level: 'error' });
  logger.error({ err: error }, 'API gateway failed to start');
  process.exit(1);
});
