import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { namespaces, supportedLocales, type Locale, type Namespace } from './config';
import { resources } from './resources';

function collectKeys(value: unknown, prefix = ''): string[] {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return prefix ? [prefix] : [];
  }

  return Object.keys(value)
    .sort()
    .flatMap((key) => {
      const path = prefix ? `${prefix}.${key}` : key;
      return collectKeys((value as Record<string, unknown>)[key], path);
    });
}

describe('translation resources', () => {
  it('exposes every namespace for both languages', () => {
    for (const locale of supportedLocales) {
      for (const namespace of namespaces) {
        assert.equal(
          Object.hasOwn(resources[locale], namespace),
          true,
          `missing namespace "${namespace}" on locale "${locale}"`,
        );
      }
    }
  });

  it('keeps the same key tree for Ukrainian and English', () => {
    const locales = [...supportedLocales] as Locale[];
    const [baseline, ...others] = locales;
    assert.ok(baseline);

    for (const namespace of namespaces as readonly Namespace[]) {
      const expected = collectKeys(resources[baseline][namespace]);

      for (const locale of others) {
        assert.deepEqual(
          collectKeys(resources[locale][namespace]),
          expected,
          `key tree mismatch in namespace "${namespace}" between "${baseline}" and "${locale}"`,
        );
      }
    }
  });
});
