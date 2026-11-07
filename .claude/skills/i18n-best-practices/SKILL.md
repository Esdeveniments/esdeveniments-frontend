---
name: i18n-best-practices
description: next-intl rules for this repo — localized links and navigation, server vs client translations, message namespaces, precompiled messages, localized JSON-LD URLs, and adding a locale. Use when adding links, translation keys, useTranslations/getTranslations calls, localized URLs, hreflang, or a new language.
---

# i18n Best Practices

Basics (locales `ca` default/`es`/`en`, `as-needed` prefix, server vs client APIs): AGENTS.md › i18n.

## Links and navigation

Use `Link`, `redirect`, `useRouter`, `usePathname`, `getPathname` from `@i18n/routing` (`i18n/routing.ts`). `next/link` drops the locale: on `/es/barcelona` a link to `/girona` goes to Catalan `/girona`. ESLint warns on `next/link`. Exceptions: primitives that add the locale themselves, and external links (`<a>`).

## Translations

- Server: `const t = await getTranslations("Components.Filters")` (`next-intl/server`). Client: `const t = useTranslations("Components.Filters")`.
- Top-level namespaces in `messages/*.json`: `App`, `Components`, `Partials`, `Pages`, `Utils`, `Config`, `Sponsor`, `Sponsorship`, `Auth`. Use the dotted path, e.g. `useTranslations("Partials.GeneratePagesData")`.
- Add every key to `messages/ca.json`, `es.json` and `en.json`; reuse keys first. `yarn i18n:check` (also in pre-push) finds missing keys.
- Messages are precompiled (`precompile: true` in `next.config.js`): every leaf is a plain ICU string. No arrays, no `t.raw()`. Lists (days, months, word lists) go in `i18n/locale-lists.json`.
- A client component that uses a new namespace: add it to `lib/i18n/client-namespaces.ts`. The layout sends the client only those namespaces; `test/i18n-client-namespaces.test.ts` fails otherwise.
- Place names in copy: never write `a {place}` or `de {place}` (Catalan contracts the article: "al Masnou", "del Maresme", "a l'Escala"). Use `{placeIn}`/`{placeOf}`/`{placeFrom}` in the message and fill them with `formatPlacePhrases(label, type, locale)` or `formatPlacePreposition(label, type, locale, false, relation)` (`utils/string-helpers.ts`). Hoist the value into a variable before `t()` so `yarn i18n:validate` sees the key. Bare `{place}` is only for labels with no preposition (breadcrumbs, filter chips).
- Shared utils that need labels at import time read `i18n/locale-labels.generated.json`, not `messages/*.json` (which would ship all locales to the browser). After editing the source keys (see `scripts/generate-locale-labels.mjs`) or `i18n/locale-lists.json`, run `yarn i18n:labels`.

## SEO URLs

- JSON-LD and other absolute URLs: `toLocalizedUrl(path, locale)` from `@utils/i18n-seo`.
- Breadcrumbs: `generateBreadcrumbList(breadcrumbs)` from `@components/partials/seo-meta`. It takes no locale; pass items whose URLs are already localized with `toLocalizedUrl`.

## Adding a locale

1. `SUPPORTED_LOCALES` in `types/i18n.ts` (`AppLocale` derives from it), plus `localeToOgLocale` and `localeToHrefLang` there. `i18n/routing.ts` reads these.
2. `messages/<locale>.json` with every key, and the loader in `i18n/request.ts`.
3. The locale's entry in `i18n/locale-lists.json`; add it to `LOCALES` in `scripts/generate-locale-labels.mjs` and run `yarn i18n:labels`.
4. Search the whole repo for other hardcoded lists, including root scripts like `check-locales.mjs` and tests: `git grep -nE "['\"]ca['\"], ?['\"]es['\"], ?['\"]en['\"]"`.

## Key files

| File | Role |
| --- | --- |
| `i18n/routing.ts` | Routing config and navigation exports |
| `i18n/request.ts` | Loads messages per locale |
| `types/i18n.ts` | `SUPPORTED_LOCALES`, `AppLocale`, OG/hreflang maps |
| `next.config.js` | next-intl plugin with `precompile: true` |
| `i18n/locale-lists.json` | Non-string lists per locale |
| `i18n/locale-labels.generated.json` | Generated labels for shared utils |
| `lib/i18n/client-namespaces.ts` | Namespaces sent to client components |
| `utils/i18n-seo.ts` | `toLocalizedUrl`, `getLocaleSafely` |
| `proxy.ts` | Sets `x-next-intl-locale` |
