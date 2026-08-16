import { describe, expect, it, vi } from 'vitest';
import { attemptPasskeySignIn, isWebAuthnSupported } from './passkey-support';

const supportedGlobal = {
  PublicKeyCredential: function PublicKeyCredential() {
    return undefined;
  },
  navigator: {
    credentials: {
      get: vi.fn(),
    },
  },
};

describe('passkey support', () => {
  it('treats a missing WebAuthn API as unsupported', () => {
    expect(isWebAuthnSupported({})).toBe(false);
  });

  it('detects a supported WebAuthn environment', () => {
    expect(isWebAuthnSupported(supportedGlobal)).toBe(true);
  });

  it('never invokes sign-in because WebAuthn is not implemented', async () => {
    const signIn = vi.fn();

    await expect(attemptPasskeySignIn(signIn, {})).resolves.toBe('unsupported');
    await expect(attemptPasskeySignIn(signIn, supportedGlobal)).resolves.toBe('not_implemented');
    expect(signIn).not.toHaveBeenCalled();
  });
});
