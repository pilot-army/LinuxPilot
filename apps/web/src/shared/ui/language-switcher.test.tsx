import { render, screen } from '@testing-library/react';
import { fireEvent } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LocaleProvider } from '../../i18n';
import { LOCALE_STORAGE_KEY } from '../../i18n';
import { LanguageSwitcher } from './language-switcher';

describe('LanguageSwitcher', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  function renderSwitcher(stored?: string) {
    if (stored) {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, stored);
    }
    return render(
      <LocaleProvider>
        <LanguageSwitcher />
      </LocaleProvider>,
    );
  }

  it('opens from the keyboard and closes on Escape', () => {
    renderSwitcher('en');
    const trigger = screen.getByRole('button', { name: 'Language' });

    fireEvent.keyDown(trigger, { key: 'Enter' });
    expect(screen.getByRole('listbox', { name: 'Language' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'EN' })).toHaveAttribute('aria-selected', 'true');

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('switches en → uk and persists the choice', () => {
    renderSwitcher('en');
    fireEvent.click(screen.getByRole('button', { name: 'Language' }));
    fireEvent.click(screen.getByRole('option', { name: 'UA' }));

    expect(document.documentElement.lang).toBe('uk');
    expect(window.localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('uk');
    expect(screen.getByRole('button', { name: 'Мова' })).toBeInTheDocument();
  });

  it('switches uk → en and updates html lang', () => {
    renderSwitcher('uk');
    fireEvent.click(screen.getByRole('button', { name: 'Мова' }));
    fireEvent.click(screen.getByRole('option', { name: 'EN' }));

    expect(document.documentElement.lang).toBe('en');
    expect(window.localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('en');
    expect(screen.getByRole('button', { name: 'Language' })).toBeInTheDocument();
  });
});

describe('LocaleProvider bootstrap', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('applies the browser language when no locale is stored', () => {
    vi.spyOn(window.navigator, 'language', 'get').mockReturnValue('uk-UA');
    render(
      <LocaleProvider>
        <span>ready</span>
      </LocaleProvider>,
    );
    expect(document.documentElement.lang).toBe('uk');
  });

  it('falls back to English when the browser language is unsupported', () => {
    vi.spyOn(window.navigator, 'language', 'get').mockReturnValue('de-DE');
    render(
      <LocaleProvider>
        <span>ready</span>
      </LocaleProvider>,
    );
    expect(document.documentElement.lang).toBe('en');
  });
});
