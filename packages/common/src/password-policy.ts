export class PasswordPolicyError extends Error {
  constructor(public readonly details: string[]) {
    super('Password does not meet complexity requirements');
    this.name = 'PasswordPolicyError';
  }
}

const MIN_LENGTH = 12;

export function evaluatePassword(password: string): string[] {
  const details: string[] = [];

  if (password.length < MIN_LENGTH) {
    details.push(`Password must be at least ${MIN_LENGTH} characters`);
  }
  if (!/[a-z]/.test(password)) {
    details.push('Password must contain a lowercase letter');
  }
  if (!/[A-Z]/.test(password)) {
    details.push('Password must contain an uppercase letter');
  }
  if (!/\d/.test(password)) {
    details.push('Password must contain a digit');
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    details.push('Password must contain a special character');
  }

  return details;
}
