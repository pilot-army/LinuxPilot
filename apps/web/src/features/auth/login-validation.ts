const LOCAL_PART_PATTERN =
  /^[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*$/;
const DOMAIN_LABEL_PATTERN = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?$/;
const TLD_PATTERN = /^[A-Za-z]{2,}$/;

export type LoginFieldErrorKey = 'emailRequired' | 'emailInvalid' | 'passwordRequired';

export type LoginFieldErrors = {
  email?: LoginFieldErrorKey;
  password?: LoginFieldErrorKey;
};

export function isValidLoginEmail(value: string): boolean {
  const email = value.trim();
  if (!email || email.length > 254) {
    return false;
  }

  const separator = email.indexOf('@');
  if (separator <= 0 || separator !== email.lastIndexOf('@') || separator === email.length - 1) {
    return false;
  }

  const localPart = email.slice(0, separator);
  const domain = email.slice(separator + 1);
  if (localPart.length > 64 || !LOCAL_PART_PATTERN.test(localPart)) {
    return false;
  }

  const labels = domain.split('.');
  if (labels.length < 2) {
    return false;
  }

  const tld = labels.at(-1);
  if (!tld || !TLD_PATTERN.test(tld)) {
    return false;
  }

  return labels.every((label) => DOMAIN_LABEL_PATTERN.test(label));
}

export function validateLoginEmail(email: string): LoginFieldErrorKey | undefined {
  const trimmedEmail = email.trim();
  if (!trimmedEmail) {
    return 'emailRequired';
  }

  if (!isValidLoginEmail(trimmedEmail)) {
    return 'emailInvalid';
  }

  return undefined;
}

export function validateLoginPassword(password: string): LoginFieldErrorKey | undefined {
  if (!password) {
    return 'passwordRequired';
  }

  return undefined;
}

export function validateLoginForm(email: string, password: string): LoginFieldErrors {
  const errors: LoginFieldErrors = {};
  const emailError = validateLoginEmail(email);
  const passwordError = validateLoginPassword(password);

  if (emailError) {
    errors.email = emailError;
  }

  if (passwordError) {
    errors.password = passwordError;
  }

  return errors;
}

export function hasLoginFieldErrors(errors: LoginFieldErrors): boolean {
  return Boolean(errors.email || errors.password);
}
