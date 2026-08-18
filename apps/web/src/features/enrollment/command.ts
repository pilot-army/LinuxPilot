export const TOKEN_MASK = '••••••••••••';
export const TOKEN_REVEAL_MS = 8_000;
export const COPY_FEEDBACK_MS = 2_500;
export const INSTALL_GUIDE_URL =
  'https://github.com/pilot-army/LinuxPilot/blob/main/apps/agent/packaging/install.md';

function quoteShell(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

export function buildEnrollCommand(enrollCommand: string, token: string): string {
  return `printf '%s\\n' ${quoteShell(token)} | ${enrollCommand}`;
}

export function maskEnrollCommand(enrollCommand: string): string {
  return buildEnrollCommand(enrollCommand, TOKEN_MASK);
}
