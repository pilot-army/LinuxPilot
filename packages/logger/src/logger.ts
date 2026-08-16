import pino, { type Logger } from 'pino';
import { SENSITIVE_PATHS } from './redact';

export type AppLogger = Logger;

export type LoggerOptions = {
  name: string;
  level?: string;
  pretty?: boolean;
};

export function createLogger(options: LoggerOptions): AppLogger {
  const level = options.level ?? 'info';

  return pino({
    name: options.name,
    level,
    redact: {
      paths: SENSITIVE_PATHS,
      censor: '[Redacted]',
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    ...(options.pretty
      ? {
          transport: {
            target: 'pino-pretty',
            options: {
              colorize: true,
              translateTime: 'SYS:standard',
              ignore: 'pid,hostname',
            },
          },
        }
      : {}),
  });
}
