import { type NextFunction, type Request, type Response } from 'express';
import { HEADER_NAMES, sanitizeRequestId } from '@linuxpilot/common';
import { type RequestWithContext } from '../http/request-context';

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const requestId = sanitizeRequestId(req.header(HEADER_NAMES.requestId));
  (req as RequestWithContext).requestId = requestId;
  res.setHeader(HEADER_NAMES.requestId, requestId);
  next();
}
