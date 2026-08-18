import { agentAuthHeaderRecord, signAgentRequest } from '@linuxpilot/common/agent-auth';
import { type AgentState } from './store';

const MAX_RESPONSE_BYTES = 64_000;

export class AgentHttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'AgentHttpError';
  }
}

export async function postJson(options: {
  url: string;
  path: string;
  body: unknown;
  timeoutMs: number;
  state?: AgentState;
}): Promise<unknown> {
  const serialized = JSON.stringify(options.body);
  if (Buffer.byteLength(serialized) > 32_768) {
    throw new AgentHttpError(413, 'Agent request body is too large');
  }
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (options.state) {
    const signed = signAgentRequest(
      options.state.privateKeyPem,
      options.state.credentialId,
      'POST',
      options.path,
      serialized,
    );
    Object.assign(headers, agentAuthHeaderRecord(signed));
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs);
  try {
    const response = await fetch(`${options.url.replace(/\/$/, '')}${options.path}`, {
      method: 'POST',
      headers,
      body: serialized,
      signal: controller.signal,
    });
    const text = await response.text();
    if (text.length > MAX_RESPONSE_BYTES) {
      throw new AgentHttpError(response.status, 'Agent response is too large');
    }
    if (!response.ok) {
      throw new AgentHttpError(response.status, 'Agent request was rejected');
    }
    return text ? JSON.parse(text) : {};
  } finally {
    clearTimeout(timeout);
  }
}

export async function withBackoff<T>(operation: () => Promise<T>, retries: number): Promise<T> {
  let attempt = 0;
  for (;;) {
    try {
      return await operation();
    } catch (error) {
      if (
        attempt >= retries ||
        (error instanceof AgentHttpError && error.status < 500 && error.status !== 429)
      ) {
        throw error;
      }
      const jitter = Math.floor(Math.random() * 400);
      const delay = Math.min(15_000, 500 * 2 ** attempt + jitter);
      await new Promise((resolve) => setTimeout(resolve, delay));
      attempt += 1;
    }
  }
}
