import { Injectable } from '@nestjs/common';
import { AUTH_ERROR_CODES } from '@linuxpilot/auth-contracts';
import { AppError, HEADER_NAMES, type ApiError, type ApiSuccess } from '@linuxpilot/common';
import { serviceAuthHeaderRecord, signServiceRequest } from '@linuxpilot/common/service-auth';
import { AppConfigService } from '../../config/app-config.service';

type AuthRequestOptions = {
  method: 'GET' | 'POST' | 'DELETE' | 'PATCH';
  path: string;
  requestId: string;
  body?: unknown;
  accessToken?: string;
};

@Injectable()
export class AuthClientService {
  constructor(private readonly config: AppConfigService) {}

  async request<T>(
    options: AuthRequestOptions,
  ): Promise<{ status: number; payload: ApiSuccess<T> }> {
    const serialized = options.body === undefined ? '' : JSON.stringify(options.body);
    const signed = signServiceRequest(
      this.config.env.SERVICE_AUTH_SECRET,
      options.method,
      options.path,
      serialized,
    );

    const headers: Record<string, string> = {
      'content-type': 'application/json',
      [HEADER_NAMES.requestId]: options.requestId,
      ...serviceAuthHeaderRecord(signed),
    };
    if (options.accessToken) {
      headers.authorization = `Bearer ${options.accessToken}`;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.env.AUTH_SERVICE_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(`${this.config.env.AUTH_SERVICE_URL}${options.path}`, {
        method: options.method,
        headers,
        body: options.body === undefined ? undefined : serialized,
        signal: controller.signal,
      });
    } catch (error) {
      if (isAbortError(error)) {
        throw new AppError(AUTH_ERROR_CODES.INTERNAL_ERROR, 'Auth service timed out', 504);
      }
      throw new AppError(AUTH_ERROR_CODES.INTERNAL_ERROR, 'Auth service is unavailable', 502);
    } finally {
      clearTimeout(timeout);
    }

    let payload: ApiSuccess<T> | ApiError;
    try {
      payload = (await response.json()) as ApiSuccess<T> | ApiError;
    } catch {
      throw new AppError(AUTH_ERROR_CODES.INTERNAL_ERROR, 'Auth service is unavailable', 502);
    }

    if (!response.ok || 'error' in payload) {
      const error = 'error' in payload ? payload.error : undefined;
      throw new AppError(
        error?.code ?? AUTH_ERROR_CODES.INTERNAL_ERROR,
        sanitizePublicMessage(error?.message ?? 'Auth service request failed'),
        publicStatus(response.status),
        [],
      );
    }

    return { status: response.status, payload };
  }
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && (error.name === 'AbortError' || error.name === 'TimeoutError');
}

function publicStatus(status: number): number {
  if (status === 504) return 504;
  if (status >= 500) return 502;
  return status;
}

function sanitizePublicMessage(message: string): string {
  return message.replace(/[\u0000-\u001F\u007F]/g, '').slice(0, 300); // eslint-disable-line no-control-regex
}
