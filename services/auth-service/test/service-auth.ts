import { HEADER_NAMES } from '@linuxpilot/common';
import { signServiceRequest, serviceAuthHeaderRecord } from '../src/common/security/service-auth';

export function signedHeaders(
  method: string,
  path: string,
  body?: unknown,
): Record<string, string> {
  const serialized = body === undefined ? '' : JSON.stringify(body);
  const signed = signServiceRequest(
    process.env.SERVICE_AUTH_SECRET as string,
    method,
    path,
    serialized,
  );
  return {
    ...serviceAuthHeaderRecord(signed),
    [HEADER_NAMES.requestId]: crypto.randomUUID(),
  };
}
