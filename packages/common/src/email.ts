const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_MIN = 3;
const USERNAME_MAX = 32;
const USERNAME_VISIBLE = /^[\p{L}\p{N}._-]+$/u;

export class UsernameValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UsernameValidationError';
  }
}

export function looksLikeEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value.trim());
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Display form: trim, NFC. Case is preserved.
 * NFC is used (canonical composition only). NFKC is intentionally avoided
 * because compatibility folding can merge visually distinct characters.
 */
export function canonicalizeUsername(username: string): string {
  const trimmed = username.trim();
  if (trimmed.length < USERNAME_MIN || trimmed.length > USERNAME_MAX) {
    throw new UsernameValidationError('Username length is invalid');
  }
  if (/\s/u.test(trimmed)) {
    throw new UsernameValidationError('Username must not contain whitespace');
  }
  if (/[\p{Cc}\p{Cf}]/u.test(trimmed)) {
    throw new UsernameValidationError('Username contains disallowed characters');
  }

  const nfc = trimmed.normalize('NFC');
  if (!USERNAME_VISIBLE.test(nfc)) {
    throw new UsernameValidationError('Username contains disallowed characters');
  }

  return nfc;
}

/**
 * Canonical unique form used for storage lookups and PostgreSQL uniqueness.
 * Lowercases after NFC. JavaScript default case mapping is applied; locale-specific
 * folding (e.g. Turkish dotted I) is not used so the same username maps the same way
 * in every deployment.
 */
export function normalizeUsername(username: string): string {
  return canonicalizeUsername(username).toLowerCase();
}

export function tryNormalizeUsername(username: string): string | null {
  try {
    return normalizeUsername(username);
  } catch {
    return null;
  }
}
