import { type NextFunction, type Request, type Response } from 'express';
import { type AppLogger } from '@linuxpilot/logger';
import { getRequestId } from '../http/request-context';

export function accessLogMiddleware(logger: AppLogger) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const started = Date.now();
    res.on('finish', () => {
      logger.info(
        {
          requestId: getRequestId(req),
          method: req.method,
          path: req.path,
          status: res.statusCode,
          durationMs: Date.now() - started,
        },
        'HTTP request',
      );
    });
    next();
  };
}
