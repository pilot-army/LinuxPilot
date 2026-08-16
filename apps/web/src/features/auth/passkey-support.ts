type WebAuthnGlobal = {
  PublicKeyCredential?: unknown;
  navigator?: {
    credentials?: {
      get?: unknown;
    };
  };
};

export function isWebAuthnSupported(globalObject: WebAuthnGlobal = window): boolean {
  return (
    typeof globalObject.PublicKeyCredential === 'function' &&
    typeof globalObject.navigator?.credentials?.get === 'function'
  );
}

export type PasskeyAttemptResult = 'unsupported' | 'not_implemented';

export async function attemptPasskeySignIn(
  _signIn?: () => Promise<void> | void,
  globalObject: WebAuthnGlobal = window,
): Promise<PasskeyAttemptResult> {
  if (!isWebAuthnSupported(globalObject)) {
    return 'unsupported';
  }
  return 'not_implemented';
}
