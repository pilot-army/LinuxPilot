import { type Request } from 'express';

export type RequestWithContext = Request & {
  requestId: string;
};

export function getRequestId(request: Request): string {
  const withContext = request as RequestWithContext;
  return withContext.requestId;
}
