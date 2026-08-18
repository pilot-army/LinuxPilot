export const supportedLocales = ['uk', 'en'] as const;

export type Locale = (typeof supportedLocales)[number];

export const namespaces = [
  'common',
  'auth',
  'navigation',
  'validation',
  'errors',
  'servers',
  'dashboard',
] as const;

export type Namespace = (typeof namespaces)[number];

export const defaultLocale: Locale = 'uk';

export const fallbackLocale: Locale = 'en';

const supportedLocaleSet = new Set<string>(supportedLocales);

export function isSupportedLocale(value: unknown): value is Locale {
  if (typeof value !== 'string') {
    return false;
  }

  return supportedLocaleSet.has(value.trim().toLowerCase());
}

export function normalizeLocale(value: unknown): Locale {
  if (typeof value !== 'string') {
    return fallbackLocale;
  }

  const language = value.trim().replace(/_/g, '-').split('-')[0]?.toLowerCase();

  if (language && isSupportedLocale(language)) {
    return language;
  }

  return fallbackLocale;
}
