import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import { AUTH_ERROR_CODES } from '@linuxpilot/auth-contracts';
import { AppError, errorResponse } from '@linuxpilot/common';
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

    this.logger.error({ err: exception, requestId }, 'Unhandled exception');
    response
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json(errorResponse(AUTH_ERROR_CODES.INTERNAL_ERROR, 'Internal server error', requestId));
  }
}

function httpCodeToErrorCode(status: number): string {
  if (status === HttpStatus.UNAUTHORIZED) {
    return AUTH_ERROR_CODES.UNAUTHORIZED;
  }
  if (status === HttpStatus.FORBIDDEN) {
    return AUTH_ERROR_CODES.FORBIDDEN;
  }
  if (status === HttpStatus.BAD_REQUEST) {
    return AUTH_ERROR_CODES.VALIDATION_ERROR;
  }
  return AUTH_ERROR_CODES.INTERNAL_ERROR;
}
