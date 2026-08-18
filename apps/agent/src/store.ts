import { chmodSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

export type AgentState = {
  serverId: string;
  credentialId: string;
  privateKeyPem: string;
  publicKeyPem: string;
  gatewayUrl: string;
};

export function statePath(stateDir: string): string {
  return join(stateDir, 'agent.json');
}

export function readState(stateDir: string): AgentState | null {
  try {
    const raw = readFileSync(statePath(stateDir), 'utf8');
    const parsed = JSON.parse(raw) as AgentState;
    if (!parsed.serverId || !parsed.credentialId || !parsed.privateKeyPem) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function writeStateAtomic(stateDir: string, state: AgentState): void {
  mkdirSync(stateDir, { recursive: true, mode: 0o700 });
  const target = statePath(stateDir);
  const temp = `${target}.${process.pid}.tmp`;
  writeFileSync(temp, `${JSON.stringify(state, null, 2)}\n`, { mode: 0o600 });
  chmodSync(temp, 0o600);
  renameSync(temp, target);
  chmodSync(target, 0o600);
  chmodSync(dirname(target), 0o700);
}
