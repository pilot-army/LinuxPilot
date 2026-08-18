import { loadAgentEnv } from './config';
import { enroll } from './enroll';
import { run } from './run';

async function main(): Promise<void> {
  const [command, ...rest] = process.argv.slice(2);
  if (command === 'enroll') {
    const gateway = flagValue(rest, '--gateway');
    if (gateway) {
      process.env.LINUXPILOT_GATEWAY_URL = gateway;
    }
    const env = loadAgentEnv();
    await enroll(env, {
      tokenFile: flagValue(rest, '--token-file'),
      stdin: rest.includes('--stdin'),
      serverId: flagValue(rest, '--server-id'),
    });
    process.stdout.write('Enrollment completed\n');
    return;
  }
  if (command === 'run' || command === undefined) {
    await run(loadAgentEnv());
    return;
  }
  if (command === 'install') {
    process.stdout.write(
      [
        'Install the agent as user linuxpilot, then enroll with a one-time token from stdin:',
        '  linuxpilot-agent enroll --gateway "$LINUXPILOT_GATEWAY_URL" --stdin',
        'Do not use curl | sudo bash as the only install method.',
        '',
      ].join('\n'),
    );
    return;
  }
  process.stderr.write('Usage: linuxpilot-agent <enroll|run|install>\n');
  process.exit(1);
}

function flagValue(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  if (index === -1) {
    return undefined;
  }
  return args[index + 1];
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Agent failed';
  process.stderr.write(`${message}\n`);
  process.exit(1);
});
