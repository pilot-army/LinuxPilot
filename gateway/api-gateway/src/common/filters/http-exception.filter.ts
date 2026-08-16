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
      const code =
        status === HttpStatus.TOO_MANY_REQUESTS
          ? AUTH_ERROR_CODES.RATE_LIMITED
          : status === HttpStatus.UNAUTHORIZED
            ? AUTH_ERROR_CODES.UNAUTHORIZED
            : status === HttpStatus.FORBIDDEN
              ? AUTH_ERROR_CODES.FORBIDDEN
              : AUTH_ERROR_CODES.INTERNAL_ERROR;
      const payload = exception.getResponse();
      const message =
        typeof payload === 'string'
          ? payload
          : status === HttpStatus.TOO_MANY_REQUESTS
            ? 'Too many requests'
            : exception.message;

      response.status(status).json(errorResponse(code, message, requestId));
      return;
    }

    this.logger.error({ err: exception, requestId }, 'Unhandled gateway exception');
    response
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json(errorResponse(AUTH_ERROR_CODES.INTERNAL_ERROR, 'Internal server error', requestId));
  }
}
