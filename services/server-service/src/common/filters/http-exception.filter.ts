import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import { AppError, errorResponse } from '@linuxpilot/common';
import { SERVER_ERROR_CODES } from '@linuxpilot/server-contracts';
import { type AppLogger } from '@linuxpilot/logger';
import { type Response } from 'express';
import { LOGGER } from '../logger/logger.token';
import { getRequestId, type RequestWithContext } from '../http/request-context';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(@Inject(LOGGER) private readonly logger: AppLogger) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<RequestWithContext>();
    const requestId = getRequestId(request);

    if (exception instanceof AppError) {
      response
        .status(exception.statusCode)
        .json(errorResponse(exception.code, exception.message, requestId, exception.details));
      return;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const payload = exception.getResponse();
      const message =
        typeof payload === 'string'
          ? payload
          : typeof payload === 'object' && payload && 'message' in payload
            ? String((payload as { message: unknown }).message)
            : exception.message;

      response.status(status).json(errorResponse(httpCodeToErrorCode(status), message, requestId));
      return;
    }

    if (isPayloadTooLarge(exception)) {
      response
        .status(HttpStatus.PAYLOAD_TOO_LARGE)
        .json(
          errorResponse(SERVER_ERROR_CODES.AGENT_BODY_TOO_LARGE, 'Request is too large', requestId),
        );
      return;
    }

    if (isPrismaSchemaMismatch(exception)) {
      this.logger.error({ err: exception, requestId }, 'Database schema is out of date');
      response
        .status(HttpStatus.SERVICE_UNAVAILABLE)
        .json(
          errorResponse(
            SERVER_ERROR_CODES.SCHEMA_OUTDATED,
            'Database schema is out of date. Run pnpm db:migrate:deploy.',
            requestId,
          ),
        );
      return;
    }

    this.logger.error({ err: exception, requestId }, 'Unhandled exception');
    response
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json(errorResponse(SERVER_ERROR_CODES.INTERNAL_ERROR, 'Internal server error', requestId));
  }
}

function isPayloadTooLarge(exception: unknown): boolean {
  if (typeof exception !== 'object' || exception === null) {
    return false;
  }
  const candidate = exception as { name?: string; status?: number; statusCode?: number };
  return (
    candidate.name === 'PayloadTooLargeError' ||
    candidate.status === HttpStatus.PAYLOAD_TOO_LARGE ||
    candidate.statusCode === HttpStatus.PAYLOAD_TOO_LARGE
  );
}

function isPrismaSchemaMismatch(exception: unknown): boolean {
  if (typeof exception !== 'object' || exception === null) {
    return false;
  }
  if (!('clientVersion' in exception) || !('code' in exception)) {
    return false;
  }
  const code = exception.code;
  return code === 'P2021' || code === 'P2022';
}

function httpCodeToErrorCode(status: number): string {
  if (status === HttpStatus.UNAUTHORIZED) {
    return SERVER_ERROR_CODES.UNAUTHORIZED;
  }
  if (status === HttpStatus.FORBIDDEN) {
    return SERVER_ERROR_CODES.FORBIDDEN;
  }
  if (status === HttpStatus.BAD_REQUEST) {
    return SERVER_ERROR_CODES.VALIDATION_ERROR;
  }
  if (status === HttpStatus.PAYLOAD_TOO_LARGE) {
    return SERVER_ERROR_CODES.AGENT_BODY_TOO_LARGE;
  }
  return SERVER_ERROR_CODES.INTERNAL_ERROR;
}
