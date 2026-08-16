import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { resources, type Locale, type Messages } from '@linuxpilot/i18n';
import {
  applyDocumentLang,
  readBrowserLanguage,
  readStoredLocale,
  resolveInitialLocale,
  writeStoredLocale,
} from './locale';

type LocaleContextValue = {
  locale: Locale;
  messages: Messages;
  setLocale: (locale: Locale) => void;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

function readInitialLocale(): Locale {
  const locale = resolveInitialLocale(readStoredLocale(), readBrowserLanguage());
  applyDocumentLang(locale);
  return locale;
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(readInitialLocale);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    writeStoredLocale(next);
    applyDocumentLang(next);
  }, []);

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      messages: resources[locale],
      setLocale,
    }),
    [locale, setLocale],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useI18n(): LocaleContextValue {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error('useI18n must be used within LocaleProvider');
  }
  return context;
}
