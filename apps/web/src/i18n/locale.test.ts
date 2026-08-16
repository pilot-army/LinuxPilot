import { afterEach, describe, expect, it } from 'vitest';
import { fallbackLocale } from '@linuxpilot/i18n';
import {
  LOCALE_STORAGE_KEY,
  applyDocumentLang,
  resolveInitialLocale,
  writeStoredLocale,
} from './locale';

describe('resolveInitialLocale', () => {
  it('prefers a stored supported locale', () => {
    expect(resolveInitialLocale('uk', 'en-US')).toBe('uk');
    expect(resolveInitialLocale('en', 'uk-UA')).toBe('en');
  });

  it('uses the browser language when nothing is stored', () => {
    expect(resolveInitialLocale(null, 'uk-UA')).toBe('uk');
    expect(resolveInitialLocale(null, 'en-GB')).toBe('en');
  });

  it('falls back to English for an unsupported browser language', () => {
    expect(resolveInitialLocale(null, 'de-DE')).toBe(fallbackLocale);
    expect(resolveInitialLocale(undefined, undefined)).toBe(fallbackLocale);
    expect(resolveInitialLocale('fr', 'pl-PL')).toBe(fallbackLocale);
  });

  it('ignores an invalid stored value and reads the browser language', () => {
    expect(resolveInitialLocale('not-a-locale', 'uk')).toBe('uk');
  });
});

describe('document language', () => {
  afterEach(() => {
    document.documentElement.lang = 'en';
  });

  it('updates document.documentElement.lang', () => {
    applyDocumentLang('uk');
    expect(document.documentElement.lang).toBe('uk');
    applyDocumentLang('en');
    expect(document.documentElement.lang).toBe('en');
  });
});

describe('locale persistence', () => {
  it('stores only the locale code under linuxpilot.locale', () => {
    writeStoredLocale('uk');
    expect(window.localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('uk');
    expect(window.localStorage.getItem('accessToken')).toBeNull();
    expect(window.localStorage.getItem('refreshToken')).toBeNull();
  });
});
