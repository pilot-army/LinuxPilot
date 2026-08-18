import { collectHeartbeat } from './collectors';
import { type AgentEnv } from './config';
import { assertLinux } from './enroll';
import { postJson, withBackoff } from './http';
import { readState } from './store';

export async function run(env: AgentEnv): Promise<void> {
  assertLinux(env);
  const state = readState(env.LINUXPILOT_STATE_DIR);
  if (!state) {
    throw new Error('Agent is not enrolled. Run linuxpilot-agent enroll --stdin');
  }

  let stopped = false;
  const shutdown = () => {
    stopped = true;
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  while (!stopped) {
    const body = await collectHeartbeat('', 250, '0.1.0');
    await withBackoff(
      () =>
        postJson({
          url: state.gatewayUrl,
          path: '/api/v1/agent/heartbeat',
          timeoutMs: env.AGENT_REQUEST_TIMEOUT_MS,
          body,
          state,
        }),
      env.AGENT_MAX_RETRIES,
    );
    await sleep(env.HEARTBEAT_INTERVAL_MS + Math.floor(Math.random() * 400));
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
