import { isSupportedLocale, normalizeLocale, type Locale } from '@linuxpilot/i18n';

export const LOCALE_STORAGE_KEY = 'linuxpilot.locale';

export function readStoredLocale(): string | null {
  try {
    return window.localStorage.getItem(LOCALE_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function writeStoredLocale(locale: Locale): void {
  try {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    // Persistence is optional; private mode or quota errors must not break the UI.
  }
}

export function readBrowserLanguage(): string | undefined {
  try {
    return window.navigator.language;
  } catch {
    return undefined;
  }
}

export function applyDocumentLang(locale: Locale): void {
  document.documentElement.lang = locale;
}

export function resolveInitialLocale(stored: unknown, browserLanguage: unknown): Locale {
  if (typeof stored === 'string' && isSupportedLocale(stored)) {
    return stored.trim().toLowerCase() as Locale;
  }

  return normalizeLocale(browserLanguage);
}
