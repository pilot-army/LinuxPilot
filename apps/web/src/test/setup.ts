import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';
import { REMEMBER_EMAIL_KEY } from '../features/auth/remember-email';
import { SPACES_SCROLL_KEY } from '../features/groups/space-path';
import { LOCALE_STORAGE_KEY } from '../i18n';
import '@testing-library/jest-dom/vitest';

if (typeof window !== 'undefined' && typeof window.localStorage?.getItem !== 'function') {
  const store = new Map<string, string>();
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, String(value));
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
      clear: () => {
        store.clear();
      },
      get length() {
        return store.size;
      },
      key: (index: number) => [...store.keys()][index] ?? null,
    },
  });
}

afterEach(() => {
  cleanup();
  window.localStorage.removeItem(LOCALE_STORAGE_KEY);
  window.localStorage.removeItem(REMEMBER_EMAIL_KEY);
  window.sessionStorage.removeItem(SPACES_SCROLL_KEY);
  document.documentElement.lang = 'en';
});
