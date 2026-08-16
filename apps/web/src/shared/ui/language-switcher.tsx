import { useEffect, useId, useRef, useState } from 'react';
import { supportedLocales, type Locale } from '@linuxpilot/i18n';
import { useI18n } from '../../i18n';
import styles from './language-switcher.module.css';

const LOCALE_LABELS: Record<Locale, 'UA' | 'EN'> = {
  uk: 'UA',
  en: 'EN',
};

export function LanguageSwitcher() {
  const { locale, setLocale, messages } = useI18n();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) {
      return;
    }

    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        setOpen(false);
        rootRef.current?.querySelector('button')?.focus();
      }
    }

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  function selectLocale(next: Locale) {
    setLocale(next);
    setOpen(false);
  }

  return (
    <div className={styles.root} ref={rootRef}>
      <button
        type="button"
        className={styles.trigger}
        aria-label={messages.common.language.switcher}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            setOpen(true);
          }
        }}
      >
        <GlobeIcon />
        <span className={styles.code}>{LOCALE_LABELS[locale]}</span>
        <ChevronIcon open={open} />
      </button>
      {open ? (
        <ul
          className={styles.menu}
          id={menuId}
          role="listbox"
          aria-label={messages.common.language.switcher}
        >
          {supportedLocales.map((option) => {
            const selected = option === locale;
            return (
              <li key={option} role="none">
                <button
                  type="button"
                  className={styles.option}
                  role="option"
                  aria-selected={selected}
                  onClick={() => selectLocale(option)}
                >
                  <span className={styles.check} aria-hidden="true">
                    {selected ? <CheckIcon /> : null}
                  </span>
                  {LOCALE_LABELS[option]}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

function GlobeIcon() {
  return (
    <svg className={styles.icon} viewBox="0 0 20 20" aria-hidden="true" focusable="false">
      <circle cx="10" cy="10" r="7.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M10 2.75c2.1 1.9 3.3 4.4 3.3 7.25S12.1 15.35 10 17.25C7.9 15.35 6.7 12.85 6.7 10S7.9 4.65 10 2.75Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path d="M3.2 8.2h13.6M3.2 11.8h13.6" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`}
      viewBox="0 0 12 12"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M2.4 4.4 6 8l3.6-3.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className={styles.checkIcon} viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path
        d="M3.2 8.2 6.4 11.4 12.8 4.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
