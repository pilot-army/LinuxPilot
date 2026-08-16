# @linuxpilot/i18n

Shared translation resources for LinuxPilot. The package is framework-agnostic: it ships locale catalogs and helpers, not a React or NestJS binding.

Supported locales:

- `uk` — Ukrainian, the default language
- `en` — English, the fallback language

**Any new key must be added to every supported language at the same time.**

## Import resources

```ts
import {
  resources,
  supportedLocales,
  defaultLocale,
  fallbackLocale,
  namespaces,
  isSupportedLocale,
  normalizeLocale,
  type Locale,
  type Namespace,
} from '@linuxpilot/i18n';
```

`Locale` is inferred from `supportedLocales`. Do not maintain a separate union type.

## Resolve and change the language

```ts
let locale: Locale = defaultLocale;

export function setLocale(next: string | null | undefined): Locale {
  locale = normalizeLocale(next);
  return locale;
}

isSupportedLocale('uk'); // true
isSupportedLocale('de'); // false
normalizeLocale('uk-UA'); // 'uk'
normalizeLocale('en-US'); // 'en'
normalizeLocale('de-DE'); // 'en' (fallback)
```

Pass browser or `Accept-Language` values through `normalizeLocale`. It accepts `undefined`, `null`, empty strings, mixed case, and tags such as `uk-UA` / `en_US`.

## Use a namespace and key

```ts
const ns: Namespace = 'common';
const saveLabel = resources[locale][ns].actions.save;
const signInTitle = resources.uk.auth.titles.signIn;
const notFound = resources.en.errors.notFound;
```

Namespaces: `common`, `auth`, `navigation`, `validation`, `errors`.

## Add a translation key

1. Add the same nested key to every language file for that namespace, for example `src/uk/common.json` and `src/en/common.json`.
2. Keep the key semantic (`actions.save`), never a full sentence.
3. Run `pnpm --filter @linuxpilot/i18n typecheck` and `pnpm --filter @linuxpilot/i18n test`.

The TypeScript build fails if the Ukrainian and English key trees diverge.

## Add a language

1. Add the locale code to `supportedLocales` in `src/config.ts`.
2. Create `src/<locale>/` with the same namespace JSON files and the same key tree.
3. Import the files in `src/resources.ts` and add the locale to `resources`.
4. Decide whether the new locale should become `defaultLocale` or `fallbackLocale`.
5. Run typecheck and tests.

## Build

JSON catalogs are compiled into `dist/` with the TypeScript output. Consumers should import `@linuxpilot/i18n` after the workspace package has been built (`turbo` already depends on `^build`).
