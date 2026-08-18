import { describe, expect, it } from 'vitest';
import { TOKEN_MASK, buildEnrollCommand, maskEnrollCommand } from './command';

const enroll = 'linuxpilot-agent enroll --gateway https://panel.example --server-id srv-1 --stdin';

describe('enrollment command', () => {
  it('builds a stdin pipeline from the real enroll command and token', () => {
    expect(buildEnrollCommand(enroll, 'one-time-token')).toBe(
      `printf '%s\\n' 'one-time-token' | ${enroll}`,
    );
  });

  it('masks the token in the visible command', () => {
    const visible = maskEnrollCommand(enroll);
    expect(visible).toContain(TOKEN_MASK);
    expect(visible).toContain(enroll);
    expect(visible).not.toContain('one-time-token');
  });

  it('does not put the token in a query string', () => {
    expect(buildEnrollCommand(enroll, 'one-time-token')).not.toMatch(/[?&]token=/);
  });
});
