import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  defaultLocale,
  fallbackLocale,
  isSupportedLocale,
  normalizeLocale,
  supportedLocales,
} from './config';

describe('supported locales', () => {
  it('lists Ukrainian and English, with Ukrainian as the default', () => {
    assert.deepEqual([...supportedLocales], ['uk', 'en']);
    assert.equal(defaultLocale, 'uk');
    assert.equal(fallbackLocale, 'en');
  });

  it('accepts the supported locale codes', () => {
    assert.equal(isSupportedLocale('uk'), true);
    assert.equal(isSupportedLocale('en'), true);
  });

  it('rejects unsupported languages', () => {
    assert.equal(isSupportedLocale('de'), false);
    assert.equal(isSupportedLocale('fr'), false);
    assert.equal(isSupportedLocale('uk-UA'), false);
  });

  it('treats locale codes as case-insensitive', () => {
    assert.equal(isSupportedLocale('UK'), true);
    assert.equal(isSupportedLocale('En'), true);
    assert.equal(isSupportedLocale('  en  '), true);
  });

  it('rejects undefined, null, and empty values', () => {
    assert.equal(isSupportedLocale(undefined), false);
    assert.equal(isSupportedLocale(null), false);
    assert.equal(isSupportedLocale(''), false);
    assert.equal(isSupportedLocale('   '), false);
  });
});

describe('normalizeLocale', () => {
  it('normalizes uk-UA to uk', () => {
    assert.equal(normalizeLocale('uk-UA'), 'uk');
  });

  it('normalizes en-US to en', () => {
    assert.equal(normalizeLocale('en-US'), 'en');
  });

  it('normalizes case-insensitive and underscore-separated tags', () => {
    assert.equal(normalizeLocale('UK'), 'uk');
    assert.equal(normalizeLocale('En'), 'en');
    assert.equal(normalizeLocale('en_US'), 'en');
    assert.equal(normalizeLocale('  uk-ua  '), 'uk');
  });

  it('falls back for an unknown language', () => {
    assert.equal(normalizeLocale('de-DE'), fallbackLocale);
    assert.equal(normalizeLocale('fr'), fallbackLocale);
  });

  it('falls back for undefined, null, and empty values', () => {
    assert.equal(normalizeLocale(undefined), fallbackLocale);
    assert.equal(normalizeLocale(null), fallbackLocale);
    assert.equal(normalizeLocale(''), fallbackLocale);
    assert.equal(normalizeLocale('   '), fallbackLocale);
  });
});
