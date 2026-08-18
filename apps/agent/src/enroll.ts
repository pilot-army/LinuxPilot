import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { readFileSync } from 'node:fs';
import { generateAgentKeyPair } from '@linuxpilot/common/agent-auth';
import { type AgentEnv } from './config';
import { postJson, withBackoff } from './http';
import { writeStateAtomic } from './store';

export async function enroll(
  env: AgentEnv,
  options: { tokenFile?: string; stdin?: boolean; serverId?: string },
) {
  assertLinux(env);
  const serverId = options.serverId ?? process.env.LINUXPILOT_SERVER_ID;
  if (!serverId) {
    throw new Error('Set --server-id or LINUXPILOT_SERVER_ID');
  }
  const token = await readToken(options);
  const keys = generateAgentKeyPair();
  const payload = await withBackoff(
    () =>
      postJson({
        url: env.LINUXPILOT_GATEWAY_URL,
        path: '/api/v1/agent/enroll',
        timeoutMs: env.AGENT_REQUEST_TIMEOUT_MS,
        body: {
          serverId,
          enrollmentToken: token,
          publicKey: keys.publicKeyPem,
          agentVersion: '0.1.0',
        },
      }),
    env.AGENT_MAX_RETRIES,
  );
  const data = unwrap(payload);
  writeStateAtomic(env.LINUXPILOT_STATE_DIR, {
    serverId: String(data.serverId),
    credentialId: String(data.credentialId),
    privateKeyPem: keys.privateKeyPem,
    publicKeyPem: keys.publicKeyPem,
    gatewayUrl: env.LINUXPILOT_GATEWAY_URL,
  });
}

async function readToken(options: { tokenFile?: string; stdin?: boolean }): Promise<string> {
  if (options.tokenFile) {
    return readFileSync(options.tokenFile, 'utf8').trim();
  }
  if (!input.isTTY || options.stdin) {
    const chunks: Buffer[] = [];
    for await (const chunk of input) {
      chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks).toString('utf8').trim();
  }
  const rl = createInterface({ input, output });
  try {
    return (await rl.question('Enrollment token: ')).trim();
  } finally {
    rl.close();
  }
}

function unwrap(payload: unknown): { serverId: string; credentialId: string } {
  const data =
    payload && typeof payload === 'object' && 'data' in payload
      ? (payload as { data: { serverId: string; credentialId: string } }).data
      : (payload as { serverId: string; credentialId: string });
  if (!data?.serverId || !data.credentialId) {
    throw new Error('Enrollment response was incomplete');
  }
  return data;
}

export function assertLinux(env: AgentEnv): void {
  if (process.platform !== 'linux' && !env.AGENT_ALLOW_NON_LINUX) {
    throw new Error('LinuxPilot agent runs only on Linux');
  }
}
