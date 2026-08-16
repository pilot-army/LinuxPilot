import { type Request } from 'express';

export type RequestWithContext = Request & {
  requestId: string;
};

export function getRequestId(request: Request): string {
  return (request as RequestWithContext).requestId;
}
