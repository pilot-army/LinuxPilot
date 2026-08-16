export const REMEMBER_EMAIL_KEY = 'linuxpilot.remember-email';

export function readRememberedEmail(): string {
  try {
    return window.localStorage.getItem(REMEMBER_EMAIL_KEY) ?? '';
  } catch {
    return '';
  }
}

export function persistRememberedEmail(email: string, rememberMe: boolean): void {
  try {
    if (rememberMe && email) {
      window.localStorage.setItem(REMEMBER_EMAIL_KEY, email);
      return;
    }

    window.localStorage.removeItem(REMEMBER_EMAIL_KEY);
  } catch {
    // Persistence is optional; private mode must not break sign-in.
  }
}
