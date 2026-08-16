import { describe, expect, it } from 'vitest';
import { hasLoginFieldErrors, isValidLoginEmail, validateLoginForm } from './login-validation';

describe('validateLoginForm', () => {
  it('requires email and password', () => {
    expect(validateLoginForm('  ', '')).toEqual({
      email: 'emailRequired',
      password: 'passwordRequired',
    });
  });

  it('rejects a value without an @ and domain', () => {
    expect(validateLoginForm('pubsik', 'secret')).toEqual({
      email: 'emailInvalid',
    });
  });

  it('rejects a malformed email', () => {
    expect(validateLoginForm('admin', 'secret')).toEqual({
      email: 'emailInvalid',
    });
  });

  it('rejects emails without a local part, @, or qualified domain', () => {
    expect(isValidLoginEmail('user@')).toBe(false);
    expect(isValidLoginEmail('@example.com')).toBe(false);
    expect(isValidLoginEmail('user@localhost')).toBe(false);
    expect(isValidLoginEmail('user@domain.')).toBe(false);
    expect(isValidLoginEmail('user@.com')).toBe(false);
    expect(isValidLoginEmail('user name@example.com')).toBe(false);
  });

  it('accepts a valid email and password', () => {
    const errors = validateLoginForm('admin@example.com', 'secret');
    expect(errors).toEqual({});
    expect(hasLoginFieldErrors(errors)).toBe(false);
    expect(isValidLoginEmail('admin@example.com')).toBe(true);
  });
});
