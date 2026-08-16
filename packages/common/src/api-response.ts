export type ApiMeta = {
  requestId: string;
};

export type ApiSuccess<T> = {
  data: T;
  meta: ApiMeta;
};

export type ApiErrorBody = {
  code: string;
  message: string;
  details: unknown[];
};

export type ApiError = {
  error: ApiErrorBody;
  meta: ApiMeta;
};

export function successResponse<T>(data: T, requestId: string): ApiSuccess<T> {
  return {
    data,
    meta: { requestId },
  };
}

export function errorResponse(
  code: string,
  message: string,
  requestId: string,
  details: unknown[] = [],
): ApiError {
  return {
    error: { code, message, details },
    meta: { requestId },
  };
}
